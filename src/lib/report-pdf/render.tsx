import { createHash } from 'node:crypto'
import { renderToBuffer } from '@react-pdf/renderer'
import sharp from 'sharp'
import { db } from '@/lib/db'
import { captureExists, createDownloadUrl, downloadCapture, removePrefix, uploadBytes } from '@/lib/storage'
import { ReportDocument, type Bitmap, type ReportAssets } from './document'
import { buildReportModel, loadReportRow, reportFilename, reportHash, reportPrefix, type ReportModel } from './model'

/// A tile is about 2.3 inches wide, so 720px prints at over 300 dpi. A marked photo
/// gets more, so a reader can zoom into the detail the mark points at.
const PHOTO_EDGE = 720
const MARKED_PHOTO_EDGE = 1400
/// Downloads and resizes in flight at once. Bounds memory on a 2 GB function while
/// keeping a 300-photo report to tens of seconds.
const CONCURRENCY = 6
const LINK_SECONDS = 10 * 60

/// A short-lived download link to the inspection's report PDF, drawing it first if no
/// stored copy matches its current inputs. Null when the inspection is not countersigned.
///
/// The PDF is far past the 4.5 MB a function may return, so it is written to the
/// private bucket and handed out as a signed URL, never through the response body.
export async function reportPdfUrl(inspectionId: string) {
  const stored = await storedReportPdf(inspectionId)
  return stored && createDownloadUrl(stored.path, LINK_SECONDS, stored.filename)
}

/// Where the inspection's current report PDF is stored, drawing it first if no stored
/// copy matches its current inputs. Null when the inspection is not countersigned. The
/// signed-copy email attaches the file from here.
export async function storedReportPdf(inspectionId: string) {
  const row = await loadReportRow(inspectionId)
  if (!row) return null
  const model = buildReportModel(row)
  const path = `${reportPrefix(inspectionId)}/${reportHash(model)}.pdf`

  if (!(await captureExists(path))) {
    const pdf = await renderToBuffer(<ReportDocument model={model} assets={await fetchAssets(model)} />)
    await recordIssued(inspectionId, path, pdf)
    await uploadBytes(path, pdf, 'application/pdf')
    await removePrefix(reportPrefix(inspectionId), { keep: path })
  } else if (!(await db.issuedReportFile.findFirst({ where: { storagePath: path }, select: { sha256: true } }))) {
    // Stored before files were recorded. Read once, so that copy can be checked too.
    await recordIssued(inspectionId, path, await downloadCapture(path))
  }
  return { path, filename: reportFilename(model) }
}

/// Recorded before the file is stored, so no copy can be handed out that a check would
/// call unknown. Two renders racing for one path each record their own bytes; both were
/// genuinely issued.
async function recordIssued(inspectionId: string, storagePath: string, pdf: Uint8Array) {
  const sha256 = createHash('sha256').update(pdf).digest('hex')
  await db.issuedReportFile.upsert({
    where: { sha256 },
    create: { sha256, inspectionId, storagePath },
    update: {},
  })
}

async function fetchAssets(model: ReportModel): Promise<ReportAssets> {
  const photos = model.rooms.flatMap((room) => room.photos)
  // Pictures outside the room grid: a repair's evidence in the assessment, and the
  // photos of updates since signing.
  const evidence = [
    ...(model.assessment?.findings ?? []).flatMap((finding) => finding.maintenanceEvidence?.evidence ?? []),
    ...model.addenda.flatMap((addendum) => addendum.entries.flatMap((entry) => entry.photos)),
  ]
    .filter((item) => /^image\/(jpeg|png|webp)$/.test(item.mimeType))

  const [photoBitmaps, evidenceBitmaps, logo] = await Promise.all([
    pool(photos, (photo) => jpeg(photo.storagePath, photo.annotations ? MARKED_PHOTO_EDGE : PHOTO_EDGE)),
    pool(evidence, (item) => jpeg(item.storagePath, PHOTO_EDGE)),
    model.branding?.logoPath ? png(await downloadCapture(model.branding.logoPath)) : null,
  ])

  return {
    photos: new Map(photos.map((photo, index) => [photo.storagePath, photoBitmaps[index]])),
    evidence: new Map(evidence.map((item, index) => [item.storagePath, evidenceBitmaps[index]])),
    logo,
    signatures: await Promise.all(model.signatures.map((signature) =>
      // Validated as a PNG data URL when it was signed (signInspection).
      png(Buffer.from(signature.imageData.slice(signature.imageData.indexOf(',') + 1), 'base64')))),
  }
}

/// `.rotate()` applies the EXIF orientation before resizing. Marks are stored against
/// the upright picture, and a photo the phone did not re-encode still carries the tag
/// (see the EXIF lesson in AGENTS.md), so this step is what keeps them aligned.
async function jpeg(storagePath: string, edge: number): Promise<Bitmap> {
  const { data, info } = await sharp(await downloadCapture(storagePath))
    .rotate()
    .resize({ width: edge, height: edge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height, format: 'jpg' }
}

async function png(bytes: Uint8Array): Promise<Bitmap> {
  const { data, info } = await sharp(bytes).png().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height, format: 'png' }
}

async function pool<T, R>(items: T[], work: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await work(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
  return results
}
