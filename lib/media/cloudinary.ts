const encoder = new TextEncoder()

export type CloudinaryResourceType = 'image' | 'video'

export interface CloudinaryUploadSignature {
  timestamp: number
  folder: string
  resourceType: CloudinaryResourceType
  signature: string
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function cloudinarySignature(parameters: Record<string, string | number>, apiSecret: string) {
  const serialized = Object.entries(parameters)
    .filter(([, value]) => value !== '' && value !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return hex(await crypto.subtle.digest('SHA-1', encoder.encode(`${serialized}${apiSecret}`)))
}

export async function createUploadSignature(resourceType: CloudinaryResourceType, apiSecret: string, now = new Date()): Promise<CloudinaryUploadSignature> {
  const timestamp = Math.floor(now.getTime() / 1000)
  const folder = 'portfolio'
  return { timestamp, folder, resourceType, signature: await cloudinarySignature({ folder, timestamp }, apiSecret) }
}

export function isOwnedCloudinaryUrl(value: string, cloudName: string, folder = 'portfolio') {
  try {
    const url = new URL(value)
    const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
    const folderIndex = segments.indexOf(folder)
    return url.protocol === 'https:'
      && url.hostname === 'res.cloudinary.com'
      && url.port === ''
      && url.username === ''
      && url.password === ''
      && segments[0] === cloudName
      && (segments[1] === 'image' || segments[1] === 'video')
      && segments[2] === 'upload'
      && folderIndex >= 3
      && folderIndex < segments.length - 1
  } catch {
    return false
  }
}

export function isOwnedCloudinaryAsset(
  value: string,
  cloudName: string,
  publicId: string,
  resourceType: CloudinaryResourceType,
  folder = 'portfolio',
): boolean {
  if (!isOwnedCloudinaryUrl(value, cloudName, folder)) return false
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean).map(decodeURIComponent)
    if (segments[1] !== resourceType) return false
    const folderIndex = segments.indexOf(folder)
    const assetSegments = segments.slice(folderIndex)
    const filename = assetSegments.at(-1)
    if (!filename) return false
    assetSegments[assetSegments.length - 1] = filename.replace(/\.[A-Za-z0-9]{1,10}$/, '')
    return assetSegments.join('/') === publicId
  } catch {
    return false
  }
}
