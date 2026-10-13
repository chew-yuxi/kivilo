import 'dotenv/config'
import { randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { PrismaPg } from '@prisma/adapter-pg'
import sharp from 'sharp'
import { PrismaClient, type ItemCondition } from '../src/generated/prisma'
import { uploadBytes } from '../src/lib/storage'

/// Seeds one countersigned check-in on the LOCAL stack from a manifest of photos, so
/// the report and its PDF can be worked on against something the size of a real one.
///
///   pnpm exec tsx scripts/dev-seed-report.ts /path/to/manifest.json
///
/// Manifest paths are relative to the manifest. Shape:
/// { address: { line1, unit, postalCode }, agency?: { name, logo? },
///   rooms: [{ name, photos: [{ file, rotate?, note?, ring?: [cx, cy, r] }],
///             items: [{ name, condition, notes?, identifier?, photos?: number[] }] }] }
type Manifest = {
  address: { line1: string; unit?: string; postalCode: string }
  agency?: { name: string; licence?: string; cea?: string; phone?: string; logo?: string }
  rooms: {
    name: string
    photos: { file: string; rotate?: number; note?: string; ring?: [number, number, number] }[]
    items: { name: string; condition: ItemCondition; notes?: string; identifier?: string; photos?: number[] }[]
  }[]
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
if (!/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) || !/@(127\.0\.0\.1|localhost):/.test(process.env.DATABASE_URL ?? '')) {
  throw new Error('dev-seed-report only runs against the local stack')
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })

async function signature(name: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120"><path d="M20 80 C 80 10, 120 110, 180 60 S 280 20, 380 70" stroke="#1f2937" stroke-width="4" fill="none"/><text x="20" y="112" font-size="14" fill="#9ca3af">${name}</text></svg>`
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  return `data:image/png;base64,${png.toString('base64')}`
}

async function main() {
  const manifestPath = resolve(process.argv[2] ?? '')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
  const at = (file: string) => resolve(dirname(manifestPath), file)
  const run = Date.now().toString(36)

  const [landlord, tenant, agent] = await Promise.all([
    db.stakeholder.create({ data: { name: 'Tan Wei Ming', email: `landlord+${run}@example.com` } }),
    db.stakeholder.create({ data: { name: 'Priya Raman', email: `tenant+${run}@example.com` } }),
    db.stakeholder.create({ data: { name: 'Alaric Yeo', email: `agent+${run}@example.com` } }),
  ])
  if (manifest.agency) {
    const { name, licence, cea, phone, logo } = manifest.agency
    const logoPath = logo
      ? await uploadBytes(`branding/${agent.id}/logo`, await sharp(readFileSync(at(logo))).png().toBuffer(), 'image/png')
      : null
    await db.agentBranding.create({
      data: { stakeholderId: agent.id, agencyName: name, agencyLicence: licence, ceaRegistration: cea, phone, logoPath },
    })
  }

  const property = await db.property.create({ data: { ...manifest.address, type: 'PRIVATE_NON_LANDED' } })
  const tenancy = await db.tenancy.create({
    data: {
      propertyId: property.id, landlordId: landlord.id, tenantId: tenant.id, agentId: agent.id,
      startDate: new Date('2025-08-22'), endDate: new Date('2027-08-21'), monthlyRent: '7200.00', deposit: '14400.00',
    },
  })
  const conductedAt = new Date('2025-08-22T02:30:00Z')
  const inspection = await db.inspection.create({
    data: {
      tenancyId: tenancy.id, kind: 'CHECK_IN', status: 'COMPLETED', conductedAt, conductedById: agent.id,
      shareToken: randomBytes(32).toString('base64url'), sharedAt: new Date(),
    },
  })

  for (const [order, room] of manifest.rooms.entries()) {
    const row = await db.room.create({ data: { inspectionId: inspection.id, name: room.name, order, status: 'REVIEWED' } })
    const captureIds: string[] = []
    for (const [index, photo] of room.photos.entries()) {
      const { data, info } = await sharp(readFileSync(at(photo.file)))
        .rotate(photo.rotate ?? 0)
        .jpeg({ quality: 85 })
        .toBuffer({ resolveWithObject: true })
      const storagePath = await uploadBytes(`${row.id}/${randomUUID()}.jpg`, data, 'image/jpeg')
      const annotations = photo.ring && {
        v: 1, by: agent.id, at: conductedAt.toISOString(), w: info.width, h: info.height,
        marks: [{ shape: 'ring', cx: photo.ring[0], cy: photo.ring[1], rx: photo.ring[2], ry: photo.ring[2] * (info.width / info.height) }],
      }
      const capture = await db.capture.create({
        data: {
          roomId: row.id, kind: 'PHOTO', storagePath, mimeType: 'image/jpeg', sizeBytes: data.length,
          note: photo.note, annotations: annotations || undefined,
          createdAt: new Date(conductedAt.getTime() + (order * 100 + index) * 20_000),
          processedAt: conductedAt,
        },
      })
      captureIds.push(capture.id)
    }
    for (const item of room.items) {
      await db.inspectionItem.create({
        data: {
          roomId: row.id, name: item.name, category: 'FIXTURE', condition: item.condition,
          notes: item.notes, identifier: item.identifier, editedByHuman: true,
          evidence: { create: (item.photos ?? []).map((index) => ({ captureId: captureIds[index] })) },
        },
      })
    }
  }

  for (const [person, offsetMinutes] of [[landlord, 40], [tenant, 55]] as const) {
    await db.signature.create({
      data: {
        inspectionId: inspection.id, stakeholderId: person.id, imageData: await signature(person.name),
        signedAt: new Date(conductedAt.getTime() + offsetMinutes * 60_000),
      },
    })
  }

  console.log(`Seeded inspection ${inspection.id}`)
  console.log(`Report: /reports/${inspection.shareToken}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
