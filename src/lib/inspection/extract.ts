import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { extractionSchema, type Extraction } from './schema'

/// Gemini reads the video and its audio in one pass, so the narration and what the
/// camera is pointing at stay tied together. Splitting them loses that.
const MODEL = 'gemini-2.5-pro'

const SYSTEM = `You are a property inventory clerk in Singapore producing the draft
condition report for a residential check-in or check-out.

You are the scribe, not the witness. The video is the evidence. Record only what the
video shows or the narrator says. Never infer a fixture that is standard for the
property type but not visible, and never soften or dramatise a condition.

Rules:
- One room per space the camera actually enters. Use the narrator's name for a room
  when they give one; otherwise name it conventionally.
- Log fixtures, appliances, furniture, notable surfaces (walls, flooring, ceilings) and
  every utility meter you can read.
- Condition is about the item's state, not its age or style. Scuffs, marks, chips,
  stains, cracks, water marks and non-working items all belong in notes, quoting the
  narrator where they describe one.
- Where the narrator and the footage disagree, record what the footage shows and say so
  in notes.
- confidence is yours to set honestly. A partly obscured item at 0.4 is more useful than
  a confident guess.
- sourceTimestampSec must point at the moment the item is clearest, so a human can jump
  straight to it.`

export async function extractFromCapture(input: {
  bytes: Uint8Array
  mimeType: string
  kind: 'CHECK_IN' | 'CHECK_OUT'
  propertyLabel: string
}): Promise<Extraction> {
  const { object } = await generateObject({
    model: google(MODEL),
    schema: extractionSchema,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${input.kind === 'CHECK_IN' ? 'Check-in' : 'Check-out'} walkthrough of ${input.propertyLabel}. Produce the draft condition report.`,
          },
          { type: 'file', data: input.bytes, mediaType: input.mimeType },
        ],
      },
    ],
  })

  return object
}
