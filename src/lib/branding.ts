import sharp from 'sharp'
import { z } from 'zod'
import { db } from '@/lib/db'
import { CAPTURE_BUCKET, createDownloadUrl, serviceClient, uploadBytes } from '@/lib/storage'
import { requireAgencyMembership } from '@/lib/agency'

const optional = (max: number) => z.string().trim().max(max).transform((value) => value || null).nullable().default(null)

export const brandingInput = z.object({
  /// The agent's own name as printed on the report. Never set by anyone before this:
  /// a first sign-in names the agent after the start of their email address.
  agentName: z.string().trim().min(1).max(120).optional(),
  agencyName: z.string().trim().min(1).max(120),
  agencyLicence: optional(40),
  ceaRegistration: optional(40),
  phone: optional(40),
})

const LOGO_MAX_BYTES = 1_000_000
const agencyBrandingInput = z.object({
  agencyLicence: optional(40),
  phone: optional(40),
})

/// What the bytes actually are, not what the client says they are. A logo is drawn on a
/// document both parties receive, so only plain raster images are accepted.
function logoType(bytes: Uint8Array) {
  const starts = (...signature: number[]) => signature.every((byte, index) => bytes[index] === byte)
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png'
  if (starts(0xff, 0xd8, 0xff)) return 'image/jpeg'
  if (starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp'
  return null
}

function logoPath(stakeholderId: string) {
  return `branding/${stakeholderId}/logo`
}

function agencyLogoPath(agencyId: string) {
  return `agency-branding/${agencyId}/logo`
}

async function rasterLogo(bytes: Uint8Array) {
  if (bytes.length === 0 || bytes.length > LOGO_MAX_BYTES || !logoType(bytes)) {
    throw new Error('Unsupported logo: use a PNG, JPEG or WebP under 1 MB')
  }
  return sharp(bytes)
    .rotate()
    .resize({ width: 1200, height: 480, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()
    .catch(() => { throw new Error('Unsupported logo: use a PNG, JPEG or WebP under 1 MB') })
}

export async function getBranding(stakeholderId: string) {
  const branding = await db.agentBranding.findUnique({ where: { stakeholderId } })
  if (!branding) return null
  return {
    agencyName: branding.agencyName,
    agencyLicence: branding.agencyLicence,
    ceaRegistration: branding.ceaRegistration,
    phone: branding.phone,
    logoUrl: branding.logoPath ? await createDownloadUrl(branding.logoPath) : null,
  }
}

export async function saveBranding(stakeholderId: string, raw: unknown) {
  const { agentName, ...input } = brandingInput.parse(raw)
  await db.$transaction(async (tx) => {
    if (agentName) await tx.stakeholder.update({ where: { id: stakeholderId }, data: { name: agentName } })
    await tx.agentBranding.upsert({
      where: { stakeholderId },
      create: { stakeholderId, ...input },
      update: input,
    })
  })
  return getBranding(stakeholderId)
}

/// Small enough to pass through the function body, unlike video. Replaces the previous
/// logo in place, so there is never more than one object per agent. The update below
/// moves `updatedAt`, which is what tells a cached report PDF the logo changed.
export async function saveBrandingLogo(stakeholderId: string, bytes: Uint8Array) {
  const branding = await db.agentBranding.findUnique({ where: { stakeholderId } })
  if (!branding) throw new Error('Save your agency name before adding a logo')
  // Stored as PNG whatever arrived: the PDF renderer draws only PNG and JPEG, and PNG
  // keeps a transparent background. Decoding also proves the bytes are an image.
  const png = await rasterLogo(bytes)
  const path = await uploadBytes(logoPath(stakeholderId), png, 'image/png')
  await db.agentBranding.update({ where: { stakeholderId }, data: { logoPath: path } })
  return getBranding(stakeholderId)
}

export async function removeBrandingLogo(stakeholderId: string) {
  const branding = await db.agentBranding.findUnique({ where: { stakeholderId } })
  if (!branding?.logoPath) return getBranding(stakeholderId)
  const { error } = await serviceClient().storage.from(CAPTURE_BUCKET).remove([branding.logoPath])
  if (error) throw error
  await db.agentBranding.update({ where: { stakeholderId }, data: { logoPath: null } })
  return getBranding(stakeholderId)
}

async function agencyBrandingManager(agencyId: string, stakeholderId: string) {
  const membership = await requireAgencyMembership(agencyId, stakeholderId)
  if (membership.role === 'AGENT') throw new Error('Team not found')
}

export async function getAgencyBranding(agencyId: string, stakeholderId: string) {
  await requireAgencyMembership(agencyId, stakeholderId)
  const agency = await db.agency.findUniqueOrThrow({
    where: { id: agencyId },
    include: { branding: true },
  })
  return {
    agencyName: agency.name,
    agencyLicence: agency.branding?.agencyLicence ?? null,
    ceaRegistration: null,
    phone: agency.branding?.phone ?? null,
    logoUrl: agency.branding?.logoPath ? await createDownloadUrl(agency.branding.logoPath) : null,
  }
}

export async function saveAgencyBranding(agencyId: string, stakeholderId: string, raw: unknown) {
  await agencyBrandingManager(agencyId, stakeholderId)
  const input = agencyBrandingInput.parse(raw)
  await db.$transaction(async (tx) => {
    const membership = await requireAgencyMembership(agencyId, stakeholderId, tx)
    if (membership.role === 'AGENT') throw new Error('Team not found')
    await tx.agencyBranding.upsert({
      where: { agencyId },
      create: { agencyId, ...input },
      update: input,
    })
    await tx.agencyActivity.create({ data: {
      agencyId,
      actorId: stakeholderId,
      actorName: (await tx.stakeholder.findUniqueOrThrow({ where: { id: stakeholderId } })).name,
      action: 'Updated report branding',
    } })
  })
  return getAgencyBranding(agencyId, stakeholderId)
}

export async function saveAgencyBrandingLogo(agencyId: string, stakeholderId: string, bytes: Uint8Array) {
  await agencyBrandingManager(agencyId, stakeholderId)
  const png = await rasterLogo(bytes)
  const path = await uploadBytes(agencyLogoPath(agencyId), png, 'image/png')
  await db.$transaction(async (tx) => {
    const membership = await requireAgencyMembership(agencyId, stakeholderId, tx)
    if (membership.role === 'AGENT') throw new Error('Team not found')
    await tx.agencyBranding.upsert({
      where: { agencyId },
      create: { agencyId, logoPath: path },
      update: { logoPath: path },
    })
    await tx.agencyActivity.create({ data: {
      agencyId,
      actorId: stakeholderId,
      actorName: (await tx.stakeholder.findUniqueOrThrow({ where: { id: stakeholderId } })).name,
      action: 'Updated report logo',
    } })
  })
  return getAgencyBranding(agencyId, stakeholderId)
}

export async function removeAgencyBrandingLogo(agencyId: string, stakeholderId: string) {
  await agencyBrandingManager(agencyId, stakeholderId)
  const branding = await db.agencyBranding.findUnique({ where: { agencyId } })
  if (!branding?.logoPath) return getAgencyBranding(agencyId, stakeholderId)
  const { error } = await serviceClient().storage.from(CAPTURE_BUCKET).remove([branding.logoPath])
  if (error) throw error
  await db.$transaction(async (tx) => {
    const membership = await requireAgencyMembership(agencyId, stakeholderId, tx)
    if (membership.role === 'AGENT') throw new Error('Team not found')
    await tx.agencyBranding.update({ where: { agencyId }, data: { logoPath: null } })
    await tx.agencyActivity.create({ data: {
      agencyId,
      actorId: stakeholderId,
      actorName: (await tx.stakeholder.findUniqueOrThrow({ where: { id: stakeholderId } })).name,
      action: 'Removed report logo',
    } })
  })
  return getAgencyBranding(agencyId, stakeholderId)
}
