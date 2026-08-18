/// Image generation through Based AI (https://ai.based.one), an OpenAI-compatible
/// gateway. Server only: the key is a spending credential. No product surface uses
/// this yet; `scripts/dev-generate-image.ts` exercises it.

const BASE_URL = 'https://ai.based.one/v1'
export const DEFAULT_IMAGE_MODEL = 'openai/gpt-image-1'
// gemini-3-pro-image is listed with an "image" capability but the images endpoint
// rejects it as a language model; it generates images via chat, not this API.

type ImagesResponse = {
  data: Array<{ b64_json?: string; url?: string; revised_prompt?: string }>
}

export async function generateImage(
  prompt: string,
  options: { model?: string; size?: string } = {},
): Promise<{ bytes: Uint8Array; mimeType: string; revisedPrompt?: string }> {
  const apiKey = process.env.BASED_AI_API_KEY
  if (!apiKey) throw new Error('BASED_AI_API_KEY is not set')

  const response = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_IMAGE_MODEL,
      prompt,
      n: 1,
      size: options.size,
      response_format: 'b64_json',
    }),
  })
  if (!response.ok) {
    throw new Error(`Based AI ${response.status}: ${(await response.text()).slice(0, 500)}`)
  }

  const [image] = ((await response.json()) as ImagesResponse).data
  if (!image) throw new Error('Based AI returned no image')

  if (image.b64_json) {
    return {
      bytes: new Uint8Array(Buffer.from(image.b64_json, 'base64')),
      mimeType: 'image/png',
      revisedPrompt: image.revised_prompt,
    }
  }
  if (image.url) {
    // Some backends ignore response_format and hand back a hosted URL instead.
    const fetched = await fetch(image.url)
    if (!fetched.ok) throw new Error(`Based AI image URL ${fetched.status}`)
    return {
      bytes: new Uint8Array(await fetched.arrayBuffer()),
      mimeType: fetched.headers.get('content-type') ?? 'image/png',
      revisedPrompt: image.revised_prompt,
    }
  }
  throw new Error('Based AI image had neither b64_json nor url')
}
