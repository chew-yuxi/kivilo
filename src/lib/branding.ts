import sharp from 'sharp'
import { z } from 'zod'
import { db } from '@/lib/db'
import { CAPTURE_BUCKET, createDownloadUrl, serviceClient, uploadBytes } from '@/lib/storage'

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
  if (bytes.length === 0 || bytes.length > LOGO_MAX_BYTES) {
    throw new Error('Unsupported logo: use a PNG, JPEG or WebP under 1 MB')
  }
  if (!logoType(bytes)) throw new Error('Unsupported logo: use a PNG, JPEG or WebP under 1 MB')
  const branding = await db.agentBranding.findUnique({ where: { stakeholderId } })
  if (!branding) throw new Error('Save your agency name before adding a logo')
  // Stored as PNG whatever arrived: the PDF renderer draws only PNG and JPEG, and PNG
  // keeps a transparent background. Decoding also proves the bytes are an image.
  const png = await sharp(bytes)
    .rotate()
    .resize({ width: 1200, height: 480, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer()
    // Right signature, unreadable body: a truncated upload, which is the client's to fix.
    .catch(() => { throw new Error('Unsupported logo: use a PNG, JPEG or WebP under 1 MB') })
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
