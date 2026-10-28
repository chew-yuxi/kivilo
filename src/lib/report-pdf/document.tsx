/* eslint-disable jsx-a11y/alt-text -- @react-pdf's Image draws into the PDF and has no alt prop. */
import { Document, Font, Image, Link, Page, Path, StyleSheet, Svg, Text, View } from '@react-pdf/renderer'
import type { ItemCondition } from '@/generated/prisma'
import { markPath } from '@/lib/annotations'
import { sgd } from '@/lib/format'
import { depositStatement } from '@/lib/assessment-schema'
import { entryHeading, type AddendumView } from '@/lib/addenda'
import { shortFingerprint } from '@/lib/report-fingerprint'
import { markNotes, type ReportModel, type ReportPhoto, type ReportRoom } from './model'

/// A serial number or meter reading split across lines with a hyphen reads as a
/// different number, so words are never hyphenated.
Font.registerHyphenationCallback((word) => [word])

export type Bitmap = { data: Buffer; width: number; height: number; format: 'jpg' | 'png' }

/// Bytes fetched for one render, keyed by storage path.
export type ReportAssets = {
  photos: Map<string, Bitmap>
  logo: Bitmap | null
  signatures: Bitmap[]
  /// Pictures outside the room grid: repair evidence, and photos of updates since signing.
  evidence: Map<string, Bitmap>
}

const INK = '#111827'
const MUTED = '#6b7280'
const RULE = '#d1d5db'
const DEFECT = '#dc2626'
const TILE_BG = '#f3f4f6'

const PAGE = { width: 595.28, height: 841.89 }
const MARGIN_X = 40
const CONTENT_WIDTH = PAGE.width - MARGIN_X * 2
const GRID_GAP = 12
const TILE = (CONTENT_WIDTH - GRID_GAP * 2) / 3
/// Taller than wide, since most phone photos are portrait, yet short enough that three
/// rows with two-line captions still fit a page.
const TILE_HEIGHT = 180

const CONDITION: Record<ItemCondition, { label: string; color: string }> = {
  NEW: { label: 'New', color: '#047857' },
  GOOD: { label: 'Good', color: '#047857' },
  FAIR: { label: 'Fair', color: '#b45309' },
  POOR: { label: 'Poor', color: '#c2410c' },
  DAMAGED: { label: 'Damaged', color: DEFECT },
}

const VERDICT = {
  TENANT_LIABLE: 'Tenant liable',
  FAIR_WEAR: 'Fair wear and tear',
  DISPUTED: 'Disputed',
  UNDECIDED: 'Undecided',
} as const

// The server runs in UTC. An inspection at 7am in Singapore is still that day here.
const TIME_ZONE = 'Asia/Singapore'
const fullDate = new Intl.DateTimeFormat('en-SG', { dateStyle: 'full', timeZone: TIME_ZONE })
const longDate = new Intl.DateTimeFormat('en-SG', { dateStyle: 'long', timeZone: TIME_ZONE })
const dateTime = new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone: TIME_ZONE })

// No `lineHeight` on a page style: in @react-pdf 4.9 it stops every `render` text (page
// numbers, "continued") and every bottom-anchored fixed element from drawing at all.
// Pinned by document.test.tsx.
const s = StyleSheet.create({
  page: { paddingTop: 76, paddingBottom: 52, paddingHorizontal: MARGIN_X, fontFamily: 'Helvetica', fontSize: 9, color: INK },
  cover: { paddingTop: 48, paddingBottom: 52, paddingHorizontal: MARGIN_X, fontFamily: 'Helvetica', fontSize: 9, color: INK },
  header: { position: 'absolute', top: 28, left: MARGIN_X, right: MARGIN_X, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 6, borderBottomWidth: 0.75, borderBottomColor: INK },
  headerRight: { alignItems: 'flex-end', maxWidth: 330 },
  footer: { position: 'absolute', bottom: 24, left: MARGIN_X, right: MARGIN_X, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7.5, color: MUTED, borderTopWidth: 0.5, borderTopColor: RULE, paddingTop: 5 },
  bold: { fontFamily: 'Helvetica-Bold' },
  small: { fontSize: 7.5, color: MUTED },
  // No letter spacing anywhere: the PDF stores each spaced letter as its own word, so a
  // search for "check-in" would not find "CHECK-IN".
  eyebrow: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: MUTED, textTransform: 'uppercase' },
  h1: { fontFamily: 'Helvetica-Bold', fontSize: 30, lineHeight: 1.1, marginTop: 6 },
  h2: { fontFamily: 'Helvetica-Bold', fontSize: 15 },
  h3: { fontFamily: 'Helvetica-Bold', fontSize: 10.5 },
  roomHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', borderBottomWidth: 0.75, borderBottomColor: RULE, paddingBottom: 4, marginBottom: 10 },
  tableHead: { flexDirection: 'row', borderBottomWidth: 0.75, borderBottomColor: INK, paddingBottom: 3, fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: MUTED, textTransform: 'uppercase' },
  row: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: RULE, paddingVertical: 4 },
  link: { color: INK, textDecoration: 'none' },
  photoRow: { flexDirection: 'row', gap: GRID_GAP, marginBottom: 14 },
  tileBox: { width: TILE, height: TILE_HEIGHT, backgroundColor: TILE_BG, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', width: 11, height: 11, borderRadius: 5.5, backgroundColor: DEFECT, borderWidth: 0.8, borderColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 6.5, lineHeight: 1 },
})

export function ReportDocument({ model, assets }: { model: ReportModel; assets: ReportAssets }) {
  const kind = model.kind === 'CHECK_OUT' ? 'Check-out' : 'Check-in'
  return (
    <Document
      title={`${kind} condition report, ${model.address}`}
      author={model.branding?.agencyName ?? model.preparer?.name ?? 'Kivilo'}
      creator="Kivilo"
      producer="Kivilo"
    >
      <Cover model={model} assets={assets} kind={kind} />
      {model.noted.length > 0 && (
        <Page size="A4" style={s.page} bookmark={{ title: 'Noted condition' }}>
          <RunningHeader model={model} assets={assets} kind={kind} />
          <RunningFooter model={model} />
          <NotedCondition model={model} />
        </Page>
      )}
      {model.rooms.map((room) => (
        <Page key={room.anchor} size="A4" style={s.page} bookmark={{ title: `${room.number}. ${room.name}` }}>
          <RunningHeader model={model} assets={assets} kind={kind} />
          <RunningFooter model={model} />
          <RoomSection room={room} assets={assets} />
        </Page>
      ))}
      <Page size="A4" style={s.page} bookmark={{ title: 'Agreement' }}>
        <RunningHeader model={model} assets={assets} kind={kind} />
        <RunningFooter model={model} />
        <Agreement model={model} assets={assets} />
        {model.assessment && <Assessment model={model} assets={assets} />}
      </Page>
      {/* Each update opens its own page, after the signatures, oldest first: the "Updated"
          pages of a paper report, but recorded rather than edited in. */}
      {model.addenda.map((addendum) => (
        <Page key={addendum.id} size="A4" style={s.page} bookmark={{ title: `Update ${addendum.number}` }}>
          <RunningHeader model={model} assets={assets} kind={kind} />
          <RunningFooter model={model} />
          <Addendum addendum={addendum} assets={assets} />
        </Page>
      ))}
    </Document>
  )
}

/// Repeated on every page it sits on. Header and footer are separate components on
/// purpose: a fragment returning both renders only the first.
function RunningHeader({ model, assets, kind }: { model: ReportModel; assets: ReportAssets; kind: string }) {
  return (
    <View fixed style={s.header}>
      {assets.logo ? (
        <Image src={assets.logo} style={{ height: 22, maxWidth: 150, objectFit: 'contain' }} />
      ) : (
        <Text style={s.bold}>{model.branding?.agencyName ?? 'Kivilo'}</Text>
      )}
      <View style={s.headerRight}>
        <Text style={s.bold}>{kind} condition report</Text>
        <Text style={s.small}>
          {model.address}
          {model.conductedAt && `  ·  ${fullDate.format(new Date(model.conductedAt))}`}
        </Text>
      </View>
    </View>
  )
}

function RunningFooter({ model }: { model: Pick<ReportModel, 'reference' | 'branding'> }) {
  return (
    <View fixed style={s.footer}>
      <Text>
        Report {model.reference}
        {model.branding && '  ·  Prepared with Kivilo'}
      </Text>
      <Text fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  )
}

function Cover({ model, assets, kind }: { model: ReportModel; assets: ReportAssets; kind: string }) {
  const { branding, preparer } = model
  const itemCount = model.rooms.reduce((n, room) => n + room.items.length, 0)
  const photoCount = model.rooms.reduce((n, room) => n + room.photos.length, 0)
  const notedCount = model.noted.reduce((n, group) => n + group.entries.length, 0)
  const counts = [
    [model.rooms.length, model.rooms.length === 1 ? 'Room' : 'Rooms'],
    [itemCount, itemCount === 1 ? 'Item' : 'Items'],
    [photoCount, photoCount === 1 ? 'Photo' : 'Photos'],
    [notedCount, 'Noted'],
  ] as const
  const signedBy = model.signatures.map((signature) => `${signature.role}, ${longDate.format(new Date(signature.signedAt))}`)

  return (
    <Page size="A4" style={s.cover}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ maxWidth: 260 }}>
          {assets.logo && <Image src={assets.logo} style={{ height: 52, maxWidth: 240, objectFit: 'contain', marginBottom: 8 }} />}
          <Text style={[s.bold, { fontSize: 11 }]}>{branding?.agencyName ?? 'Kivilo'}</Text>
          {branding?.agencyLicence && <Text style={s.small}>Agency licence {branding.agencyLicence}</Text>}
        </View>
        {preparer && (
          <View style={{ alignItems: 'flex-end', maxWidth: 220 }}>
            <Text style={s.small}>Prepared by</Text>
            <Text style={s.bold}>{preparer.name}</Text>
            {branding?.ceaRegistration && <Text style={s.small}>CEA registration {branding.ceaRegistration}</Text>}
            {branding?.phone && <Text style={s.small}>{branding.phone}</Text>}
            {preparer.email && <Text style={s.small}>{preparer.email}</Text>}
          </View>
        )}
      </View>

      <View style={{ marginTop: 64 }}>
        <Text style={s.eyebrow}>{kind}</Text>
        <Text style={s.h1}>Condition report</Text>
        <Text style={{ fontSize: 15, marginTop: 10 }}>{model.address}</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 28, borderTopWidth: 0.75, borderTopColor: INK, paddingTop: 12 }}>
        <Fact label="Inspected" value={model.conductedAt ? fullDate.format(new Date(model.conductedAt)) : 'Not recorded'} />
        <Fact label="Inspector" value={model.inspector ?? 'Not recorded'} />
        <Fact label="Landlord" value={model.landlord} />
        <Fact label="Tenant" value={model.tenant} />
        <Fact label="Tenancy" value={`${longDate.format(new Date(model.tenancyStart))} to ${longDate.format(new Date(model.tenancyEnd))}`} />
        <Fact label="Signed" value={signedBy.length > 0 ? signedBy.join('\n') : 'Not yet signed'} />
      </View>

      <View style={{ flexDirection: 'row', marginTop: 20, borderTopWidth: 0.5, borderTopColor: RULE, borderBottomWidth: 0.5, borderBottomColor: RULE, paddingVertical: 10 }}>
        {counts.map(([value, label]) => (
          <View key={label} style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 18, lineHeight: 1.2, color: label === 'Noted' && value > 0 ? DEFECT : INK }}>{value}</Text>
            <Text style={s.small}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 18 }}>
        <Text style={[s.eyebrow, { marginBottom: 4 }]}>Contents</Text>
        {model.noted.length > 0 && <ContentsLine href="#noted" label="Noted condition" detail="Items below good, and captioned or marked photos" />}
        {model.rooms.map((room) => (
          <ContentsLine
            key={room.anchor}
            href={`#${room.anchor}`}
            label={`${room.number}.  ${room.name}`}
            detail={`${room.items.length} items  ·  ${room.photos.length} photos`}
          />
        ))}
        <ContentsLine href="#agreement" label="Agreement" detail={model.assessment ? 'Signatures, and the check-out assessment' : 'Signatures'} />
        {model.addenda.map((addendum) => (
          <ContentsLine
            key={addendum.id}
            href={`#update-${addendum.number}`}
            label={`${addendum.source === 'MOVE_IN_DEFECT' ? 'Move-in condition reported' : 'Updated'} ${longDate.format(new Date(addendum.effectiveDate))}`}
            detail={addendum.dispute ? `${addendum.title}  ·  Disputed` : addendum.acknowledgedAt ? addendum.title : `${addendum.title}  ·  Pending acknowledgement`}
          />
        ))}
      </View>

      <RunningFooter model={model} />
    </Page>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '50%', marginBottom: 10, paddingRight: 12 }}>
      <Text style={s.small}>{label}</Text>
      <Text style={{ fontSize: 10 }}>{value}</Text>
    </View>
  )
}

function ContentsLine({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link src={href} style={s.link}>
      <View style={[s.row, { justifyContent: 'space-between', paddingVertical: 3 }]}>
        <Text style={s.bold}>{label}</Text>
        <Text style={s.small}>{detail}</Text>
      </View>
    </Link>
  )
}

function NotedCondition({ model }: { model: ReportModel }) {
  return (
    <View id="noted">
      <Text style={s.h2}>Noted condition</Text>
      <Text style={[s.small, { marginTop: 3, marginBottom: 12 }]}>
        Every item rated fair, poor or damaged, and every photo the inspector captioned or
        marked, by room. Photo numbers link to the photo.
      </Text>
      {model.noted.map(({ room, entries }) => (
        <View key={room.anchor} style={{ marginBottom: 12 }}>
          <View wrap={false}>
            <Link src={`#${room.anchor}`} style={s.link}>
              <Text style={[s.h3, { marginBottom: 3 }]}>{room.number}.  {room.name}</Text>
            </Link>
          </View>
          {entries.map((entry, index) => (
            <View key={index} style={s.row} wrap={false}>
              {entry.kind === 'item' ? (
                <>
                  <View style={{ width: 62 }}>
                    <Text style={{ color: CONDITION[entry.condition].color, fontFamily: 'Helvetica-Bold', fontSize: 8 }}>
                      {CONDITION[entry.condition].label}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bold}>{entry.label}</Text>
                    {entry.detail && <Text>{entry.detail}</Text>}
                  </View>
                  <PhotoRefs refs={entry.photoRefs} labelled />
                </>
              ) : (
                <>
                  <View style={{ width: 62 }}>
                    <Link src={`#${entry.anchor}`} style={s.link}>
                      <Text style={s.bold}>Photo {entry.ref}</Text>
                    </Link>
                  </View>
                  <View style={{ flex: 1 }}>
                    {entry.detail.length > 0
                      ? entry.detail.map((line) => <Text key={line} style={{ color: DEFECT }}>{line}</Text>)
                      : <Text style={{ color: MUTED }}>Marked without a note</Text>}
                  </View>
                </>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function PhotoRefs({ refs, labelled = false }: { refs: { ref: string; anchor: string }[]; labelled?: boolean }) {
  return (
    <View style={{ width: labelled ? 90 : 70, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      {labelled && refs.length > 0 && <Text style={{ fontSize: 8, color: MUTED }}>{refs.length === 1 ? 'Photo ' : 'Photos '}</Text>}
      {refs.map((photo, index) => (
        <Link key={photo.anchor} src={`#${photo.anchor}`} style={[s.link, { fontSize: 8 }]}>
          {index > 0 ? `, ${photo.ref}` : photo.ref}
        </Link>
      ))}
    </View>
  )
}

function RoomSection({ room, assets }: { room: ReportRoom; assets: ReportAssets }) {
  const rows: ReportPhoto[][] = []
  for (let index = 0; index < room.photos.length; index += 3) rows.push(room.photos.slice(index, index + 3))

  return (
    <View id={room.anchor}>
      {/* Repeats at the top of every page this room runs onto. */}
      <View fixed style={s.roomHeading}>
        <Text style={s.h2}>{room.number}.  {room.name}</Text>
        <Text
          fixed
          style={s.small}
          render={({ subPageNumber }) =>
            subPageNumber > 1 ? 'continued' : `${room.items.length} items  ·  ${room.photos.length} photos`}
        />
      </View>

      {room.items.length > 0 ? (
        <View style={{ marginBottom: 16 }}>
          <View style={s.tableHead} wrap={false}>
            <Text style={{ width: '34%' }}>Item</Text>
            <Text style={{ width: '12%' }}>Condition</Text>
            <Text style={{ width: '40%' }}>Notes</Text>
            <Text style={{ width: '14%', textAlign: 'right' }}>Photos</Text>
          </View>
          {room.items.map((item, index) => (
            <View key={index} style={s.row} wrap={false}>
              <View style={{ width: '34%', paddingRight: 8 }}>
                <Text style={s.bold}>{item.name}{item.quantity > 1 && `  ×${item.quantity}`}</Text>
                {item.identifier && <Text style={{ fontFamily: 'Courier', fontSize: 7.5, color: MUTED }}>{item.identifier}</Text>}
              </View>
              <Text style={{ width: '12%', color: CONDITION[item.condition].color, fontFamily: 'Helvetica-Bold', fontSize: 8 }}>
                {CONDITION[item.condition].label}
              </Text>
              <View style={{ width: '40%', paddingRight: 8 }}>
                {item.meterReading && <Text style={{ fontFamily: 'Courier', fontSize: 8 }}>Reading: {item.meterReading}</Text>}
                {item.notes && <Text>{item.notes}</Text>}
              </View>
              <View style={{ width: '14%', alignItems: 'flex-end' }}>
                <PhotoRefs refs={item.photoRefs} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[s.small, { marginBottom: 16 }]}>Nothing recorded in this room.</Text>
      )}

      {rows.map((row) => (
        <View key={row[0].anchor} style={s.photoRow} wrap={false}>
          {row.map((photo) => (
            <PhotoTile key={photo.anchor} photo={photo} bitmap={assets.photos.get(photo.storagePath) ?? null} />
          ))}
        </View>
      ))}
      {rows.length === 0 && <Text style={s.small}>No photos in this room.</Text>}
    </View>
  )
}

/// One photograph, fitted whole inside a square tile (never cropped: what is outside
/// the crop is evidence too), with the inspector's marks drawn over it as vectors.
function PhotoTile({ photo, bitmap }: { photo: ReportPhoto; bitmap: Bitmap | null }) {
  const notes = markNotes(photo)
  return (
    <View id={photo.anchor} style={{ width: TILE }}>
      <View style={s.tileBox}>
        {bitmap ? <MarkedImage annotations={photo.annotations} bitmap={bitmap} /> : <Text style={s.small}>Photo unavailable</Text>}
      </View>
      <View style={{ marginTop: 4 }}>
        <Text style={[s.small, s.bold]}>
          {photo.ref}
          {photo.shows.length > 0 && <Text style={{ fontFamily: 'Helvetica' }}>{`  ${photo.shows.join(', ')}`}</Text>}
        </Text>
        {photo.note && <Text style={{ color: DEFECT, fontSize: 8.5 }}>{photo.note}</Text>}
        {notes.map((line) => <Text key={line} style={{ color: DEFECT, fontSize: 8 }}>{line}</Text>)}
      </View>
    </View>
  )
}

/// Contained in a box of `maxWidth` by `maxHeight`, the room grid's tile by default.
function MarkedImage({ annotations: marks, bitmap, maxWidth = TILE, maxHeight = TILE_HEIGHT }: {
  annotations: ReportPhoto['annotations']
  bitmap: Bitmap
  maxWidth?: number
  maxHeight?: number
}) {
  const scale = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height)
  const width = bitmap.width * scale
  const height = bitmap.height * scale

  return (
    <View style={{ width, height }}>
      <Image src={bitmap} style={{ width, height }} />
      {marks && (
        <>
          {/* Geometry is stored against the upright image's own pixel box, so the
              viewBox is that box and the drawing scales with the picture exactly. Stroke
              widths are converted from points so a ring reads the same on every tile. */}
          <Svg viewBox={`0 0 ${marks.w} ${marks.h}`} style={{ position: 'absolute', top: 0, left: 0, width, height }}>
            {marks.marks.map((mark, index) => (
              <Path key={`halo-${index}`} d={markPath(mark, marks.w, marks.h)} stroke="#ffffff" strokeWidth={(3.4 * marks.w) / width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {marks.marks.map((mark, index) => (
              <Path key={`mark-${index}`} d={markPath(mark, marks.w, marks.h)} stroke={DEFECT} strokeWidth={(1.7 * marks.w) / width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </Svg>
          {marks.marks.map((mark, index) => {
            const anchor = mark.shape === 'ring'
              ? { x: mark.cx - mark.rx, y: mark.cy - mark.ry }
              : mark.shape === 'arrow' ? { x: mark.tx, y: mark.ty } : mark.points[0]
            return (
              <View key={`badge-${index}`} style={[s.badge, { left: anchor.x * width - 5.5, top: anchor.y * height - 5.5 }]}>
                <Text style={s.badgeText}>{index + 1}</Text>
              </View>
            )
          })}
        </>
      )}
    </View>
  )
}

function Agreement({ model, assets }: { model: ReportModel; assets: ReportAssets }) {
  return (
    <View id="agreement">
      <Text style={s.h2}>Agreement</Text>
      <Text style={{ marginTop: 6, marginBottom: 16, maxWidth: 420 }}>
        The rooms, items and photographs in this report were agreed and signed by the
        people below.
      </Text>
      <View style={{ flexDirection: 'row', gap: 24 }}>
        {model.signatures.map((signature, index) => (
          <View key={index} style={{ flex: 1 }} wrap={false}>
            {assets.signatures[index] && (
              <Image src={assets.signatures[index]} style={{ height: 56, objectFit: 'contain', objectPosition: 'left' }} />
            )}
            <View style={{ borderTopWidth: 0.75, borderTopColor: INK, paddingTop: 4, marginTop: 4 }}>
              <Text style={s.bold}>{signature.name}</Text>
              <Text style={s.small}>{signature.role}, signed {dateTime.format(new Date(signature.signedAt))}</Text>
              {signature.contentHash && (
                <Text style={s.small}>Content fingerprint {shortFingerprint(signature.contentHash)}</Text>
              )}
            </View>
          </View>
        ))}
      </View>
      <Text style={[s.small, { marginTop: 28, maxWidth: 440 }]}>
        Rooms and items in this report were written by the inspector against a recorded
        walkthrough and agreed by the people named above. The recordings and photographs are
        retained as the underlying evidence. Where a photograph carries marks, the inspector
        drew them to point out a detail; they are recorded separately and nothing has been
        painted onto the photograph itself.
      </Text>
    </View>
  )
}

function Assessment({ model, assets }: { model: ReportModel; assets: ReportAssets }) {
  const assessment = model.assessment!
  const liable = assessment.findings.filter((finding) => finding.verdict === 'TENANT_LIABLE')
  const total = liable.reduce((sum, finding) => sum + Number(finding.estimatedCost ?? 0), 0)
  const statement = depositStatement(assessment)

  return (
    <View break>
      <Text style={s.h2}>Check-out assessment</Text>
      <Text style={[s.small, { marginTop: 3 }]}>
        Version {assessment.version}, published {dateTime.format(new Date(assessment.publishedAt))}. This
        assessment is separate from the signed inventory.
      </Text>
      {assessment.summary && <Text style={{ marginTop: 10 }}>{assessment.summary}</Text>}
      {statement ? (
        <View style={{ marginTop: 10, marginBottom: 10, padding: 8, borderWidth: 0.5, borderColor: '#d1d5db' }} wrap={false}>
          <Text style={s.bold}>Deposit statement</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text>Deposit</Text>
            <Text>{sgd(statement.deposit)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text>Deductions ({statement.deducted.length} of {assessment.findings.length} findings, tenant liable)</Text>
            <Text>{sgd(-statement.deductions)}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
            <Text style={s.bold}>{statement.toReturn >= 0 ? 'To return to the tenant' : 'Deductions exceed the deposit by'}</Text>
            <Text style={s.bold}>{sgd(Math.abs(statement.toReturn))}</Text>
          </View>
          {assessment.responses.map((response) => (
            <Text key={response.role} style={{ marginTop: 4 }}>
              {response.name} ({response.role}):{' '}
              {response.answer
                ? `${response.answer === 'AGREED' ? 'agreed' : 'disputed'}${response.inPerson ? ' in person' : ''}, ${dateTime.format(new Date(response.respondedAt!))}${response.reason ? `. "${response.reason}"` : ''}`
                : 'not answered yet'}
            </Text>
          ))}
          <Text style={[s.small, { marginTop: 4 }]}>Kivilo records each party&apos;s answer. It does not hold or move the deposit.</Text>
        </View>
      ) : (
        <Text style={{ marginTop: 10, marginBottom: 10 }}>
          {liable.length} of {assessment.findings.length} findings assess tenant liability, totalling{' '}
          <Text style={s.bold}>{sgd(total)}</Text> against a deposit of {sgd(model.deposit)}.
        </Text>
      )}
      {assessment.findings.map((finding, findingIndex) => (
        <View key={finding.id} style={[s.row, { flexDirection: 'column' }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.bold}>{finding.itemLabel}</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: finding.verdict === 'TENANT_LIABLE' ? DEFECT : MUTED }}>
              {VERDICT[finding.verdict]}{finding.estimatedCost && `, ${sgd(finding.estimatedCost)}`}
            </Text>
          </View>
          <Text style={{ color: '#374151' }}>{finding.rationale}</Text>
          {(finding.photos?.length ?? 0) > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={[s.small, s.bold]}>Finding photos</Text>
              {Array.from({ length: Math.ceil(finding.photos!.length / 3) }, (_, row) => (
                <View key={row} style={{ flexDirection: 'row', gap: GRID_GAP, marginTop: 6 }} wrap={false}>
                  {finding.photos!.slice(row * 3, row * 3 + 3).map((photo, column) => (
                    <PhotoTile
                      key={photo.id}
                      photo={{
                        ref: `F${findingIndex + 1}.${row * 3 + column + 1}`,
                        anchor: `finding-photo-${findingIndex + 1}-${row * 3 + column + 1}`,
                        storagePath: photo.storagePath,
                        note: photo.note,
                        annotations: photo.annotations,
                        shows: [],
                      }}
                      bitmap={assets.evidence.get(photo.storagePath) ?? null}
                    />
                  ))}
                </View>
              ))}
            </View>
          )}
          {finding.maintenanceEvidence && (
            <View style={{ marginTop: 6 }}>
              <Text style={s.small}>Maintenance record: {finding.maintenanceEvidence.title}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                {finding.maintenanceEvidence.evidence.map((item) => {
                  const bitmap = assets.evidence.get(item.storagePath)
                  return bitmap ? (
                    <View key={item.id} style={{ width: 110 }}>
                      <View style={[s.tileBox, { width: 110, height: 82 }]}>
                        <MarkedImage annotations={item.annotations ?? null} bitmap={bitmap} maxWidth={110} maxHeight={82} />
                      </View>
                      <Text style={s.small}>{item.purpose.toLowerCase()}{item.note && `: ${item.note}`}</Text>
                    </View>
                  ) : (
                    <Text key={item.id} style={s.small}>{item.purpose.toLowerCase()} evidence ({item.mimeType})</Text>
                  )
                })}
              </View>
            </View>
          )}
        </View>
      ))}
    </View>
  )
}

/// One update since signing. The banner is the "Updated <date>" a reader looks for; the
/// acknowledgements say whether it is part of what both parties agreed yet.
function Addendum({ addendum, assets }: { addendum: AddendumView; assets: ReportAssets }) {
  return (
    <View id={`update-${addendum.number}`}>
      <View style={{ backgroundColor: '#fef3c7', paddingVertical: 6, paddingHorizontal: 8, marginBottom: 10 }}>
        <Text style={[s.bold, { fontSize: 12, color: '#92400e' }]}>
          {addendum.source === 'MOVE_IN_DEFECT' ? 'Move-in condition reported ' : 'Updated '}{longDate.format(new Date(addendum.effectiveDate))}
        </Text>
        <Text style={{ color: '#92400e' }}>
          Update {addendum.number}
          {addendum.dispute ? '  ·  Disputed' : addendum.acknowledgedAt ? '' : '  ·  Pending acknowledgement'}
        </Text>
      </View>
      <Text style={s.h2}>{addendum.title}</Text>
      {addendum.reason && <Text style={{ marginTop: 4 }}>{addendum.reason}</Text>}
      {addendum.moveInDefect && (
        <Text style={{ marginTop: 4 }}>
          Reported by the tenant {dateTime.format(new Date(addendum.moveInDefect.reportedAt))}.
          Reporting deadline: {longDate.format(new Date(`${addendum.moveInDefect.deadline}T12:00:00+08:00`))}.
        </Text>
      )}
      {addendum.dispute && (
        <View style={{ marginTop: 6, padding: 8, backgroundColor: '#fef2f2' }}>
          <Text style={[s.bold, { color: '#991b1b' }]}>Disputed by {addendum.dispute.disputedBy}, {dateTime.format(new Date(addendum.dispute.disputedAt))}</Text>
          <Text>{addendum.dispute.reason}</Text>
          <Text>This claim is recorded separately and is not part of the agreed check-in.</Text>
        </View>
      )}
      <Text style={[s.small, { marginTop: 4, marginBottom: 12 }]}>
        Published by {addendum.publishedBy}, {dateTime.format(new Date(addendum.publishedAt))}. Recorded beside
        the signed report, which it does not change.
      </Text>

      {addendum.entries.map((entry) => (
        <View key={entry.id} style={[s.row, { flexDirection: 'column', paddingVertical: 6 }]} wrap={false}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.bold}>{entryHeading(entry, addendum.source)}</Text>
            <Text style={s.small}>{entry.roomName}</Text>
          </View>
          {entry.change === 'REPLACED' && entry.target && (
            <Text style={s.small}>
              Was: {entry.target.name}{entry.target.identifier && `  ·  ${entry.target.identifier}`}
            </Text>
          )}
          {entry.line && (
            <Text>
              <Text style={{ color: CONDITION[entry.line.condition].color, fontFamily: 'Helvetica-Bold', fontSize: 8 }}>
                {CONDITION[entry.line.condition].label}
              </Text>
              {entry.line.quantity > 1 && `  ×${entry.line.quantity}`}
            </Text>
          )}
          {entry.line?.identifier && <Text style={{ fontFamily: 'Courier', fontSize: 7.5, color: MUTED }}>{entry.line.identifier}</Text>}
          {entry.notes && <Text style={{ color: '#374151' }}>{entry.notes}</Text>}
          {entry.maintenanceCase && <Text style={s.small}>From the repair record: {entry.maintenanceCase.title}</Text>}
          {entry.photos.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP, marginTop: 6 }}>
              {entry.photos.map((photo) => {
                const bitmap = assets.evidence.get(photo.storagePath)
                return (
                  <View key={photo.id} style={{ width: TILE }}>
                    <View style={[s.tileBox, { height: 140 }]}>
                      {bitmap
                        ? <MarkedImage annotations={photo.annotations ?? null} bitmap={bitmap} maxHeight={140} />
                        : <Text style={s.small}>Photo unavailable</Text>}
                    </View>
                    {(photo.label || photo.note) && (
                      <Text style={[s.small, { marginTop: 3 }]}>{[photo.label, photo.note].filter(Boolean).join(': ')}</Text>
                    )}
                  </View>
                )
              })}
            </View>
          )}
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: 24, marginTop: 16 }} wrap={false}>
        {addendum.acknowledgements.map((ack) => (
          <View key={ack.role} style={{ flex: 1, borderTopWidth: 0.75, borderTopColor: INK, paddingTop: 4 }}>
            <Text style={s.bold}>{ack.name}</Text>
            <Text style={{ fontSize: 8, color: ack.acknowledgedAt ? '#047857' : '#b45309' }}>
              {ack.role}, {addendum.dispute && ack.role === 'Landlord'
                ? 'disputed'
                : ack.acknowledgedAt
                ? `acknowledged ${ack.inPerson ? 'in person ' : ''}${dateTime.format(new Date(ack.acknowledgedAt))}`
                : 'pending acknowledgement'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
