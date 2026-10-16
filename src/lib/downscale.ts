/// Longest edge a photo is sent at. A phone camera frame is 4 to 6 MB; at this size it
/// is a fifth of that and a rating plate is still legible, which is all the report needs.
const MAX_PHOTO_EDGE = 2048

/// Re-encodes a photo in the browser as an upright JPEG no longer than MAX_PHOTO_EDGE.
/// The browser applies EXIF orientation when it decodes, so the result needs no rotation.
///
/// Resolves to null when the photo is already small enough (unless `always`, which a
/// format the server does not store, such as an iPhone's HEIC, needs), or when the
/// browser cannot decode it, in which case the caller decides what to do with the original.
export async function downscale(file: File, { always = false } = {}): Promise<Blob | null> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    try {
      await image.decode()
    } catch {
      return null
    }
    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
    if (scale === 1 && !always) return null
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the photo'))),
        'image/jpeg',
        0.85,
      ),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
