import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { roomExtractionSchema, type RoomExtraction } from './schema'

/// Gemini reads the video and its audio in one pass, so the narration and what the
/// camera is pointing at stay tied together.
const MODEL = 'gemini-2.5-pro'

const SYSTEM = `You are a property inventory clerk in Singapore producing the draft
condition report for one room of a residential check-in or check-out.

You are the scribe, not the witness. The captures are the evidence. Record only what
they show or what the inspector says. Never infer a fixture that is standard for the
property type but not visible, and never soften or dramatise a condition.

You are given two kinds of capture for this room:
- A narrated video walkthrough. Good for what is present, where it is, and its overall
  condition. It is compressed, so small print in it is not reliable.
- Still photographs, taken deliberately. These are the ones to read text from: appliance
  rating plates, model and serial labels, meter faces, and close-ups of specific defects.

Rules:
- Log fixtures, appliances, furniture, notable surfaces (walls, flooring, ceilings) and
  any utility meter in this room. Do not invent a room boundary: everything you record
  belongs to the room you were given.
- **identifier**: transcribe make, model, and serial character-for-character from a
  photographed label. Preserve case, punctuation, and spacing exactly. If a character is
  genuinely ambiguous (0 versus O, 1 versus I, 8 versus B), leave identifier null and
  say what you could and could not read in notes. A wrong serial is worse than none: it
  will be relied on at check-out to prove this is the same physical object.
- Condition is about the item's state, not its age or style. Scuffs, marks, chips,
  stains, cracks, water marks and non-working items belong in notes, quoting the
  inspector where they describe one.
- Where the inspector and the footage disagree, record what the footage shows and say so.
- Merge across captures: if a photo shows the label of an appliance already seen in the
  video, that is one item with both an identifier and a condition, not two items.
- confidence is yours to set honestly. A partly obscured item at 0.4 is more useful than
  a confident guess.
- sourceCaptureRef must name the capture the item was actually read from. Prefer the
  photo when one exists, since it is the better evidence to show a reader.`

export type CaptureInput = {
  ref: string
  kind: 'VIDEO' | 'PHOTO'
  bytes: Uint8Array
  mimeType: string
  note: string | null
}

type RoomInput = {
  captures: CaptureInput[]
  roomName: string
  kind: 'CHECK_IN' | 'CHECK_OUT'
  propertyLabel: string
}

/// The end-to-end suite walks the real capture, upload, review, and signing path but
/// cannot pay a Gemini call per run or wait minutes for it, so this stands in for the
/// model when KIVILO_FAKE_EXTRACTION=1. It has the same shape a real extraction has,
/// including refs that point at the room's actual captures. It is refused on Vercel so
/// a stray env var can never draft a real report from nothing.
function fakeExtraction(input: RoomInput): RoomExtraction {
  if (process.env.VERCEL) {
    throw new Error('KIVILO_FAKE_EXTRACTION is for local end-to-end tests only')
  }
  const video = input.captures.find((c) => c.kind === 'VIDEO') ?? input.captures[0]
  const photo = input.captures.find((c) => c.kind === 'PHOTO') ?? video
  return {
    summary: `${input.roomName} in fair overall condition, one appliance identified from its label.`,
    transcript: `Okay, ${input.roomName.toLowerCase()}. Worktop has a chip to the right of the sink.`,
    items: [
      {
        name: 'Refrigerator',
        category: 'APPLIANCE',
        condition: 'GOOD',
        quantity: 1,
        notes: 'Small dent on the lower door.',
        identifier: 'SAMSUNG RF48A4000S9/SS SERIAL 0KM74BDT200341N',
        meterReading: null,
        sourceCaptureRef: photo.ref,
        sourceTimestampSec: null,
        confidence: 0.92,
      },
      {
        name: 'Worktop',
        category: 'SURFACE',
        condition: 'FAIR',
        quantity: 1,
        notes: 'Chip to the right of the sink, as narrated.',
        identifier: null,
        meterReading: null,
        sourceCaptureRef: video.ref,
        sourceTimestampSec: 3,
        confidence: 0.55,
      },
    ],
  }
}

export async function extractRoom(input: RoomInput): Promise<RoomExtraction> {
  if (process.env.KIVILO_FAKE_EXTRACTION === '1') return fakeExtraction(input)

  const header = [
    `${input.kind === 'CHECK_IN' ? 'Check-in' : 'Check-out'} of ${input.propertyLabel}.`,
    `Room: ${input.roomName}.`,
    '',
    'Captures for this room, in order:',
    ...input.captures.map(
      (c) =>
        `- ref "${c.ref}" (${c.kind.toLowerCase()})${c.note ? `, inspector's note: ${c.note}` : ''}`,
    ),
    '',
    'Produce the draft inventory for this room.',
  ].join('\n')

  const { object } = await generateObject({
    model: google(MODEL),
    schema: roomExtractionSchema,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: header },
          // Each file is preceded by its ref so the model can cite it back.
          ...input.captures.flatMap((capture) => [
            { type: 'text' as const, text: `Capture "${capture.ref}":` },
            { type: 'file' as const, data: capture.bytes, mediaType: capture.mimeType },
          ]),
        ],
      },
    ],
  })

  return object
}
