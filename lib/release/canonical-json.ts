const encoder = new TextEncoder()

function canonicalValue(value: unknown): unknown {
  if (typeof value === 'string') return value.normalize('NFC')
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Canonical JSON does not support non-finite numbers.')
    return value
  }
  if (value === null || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>
    return Object.fromEntries(Object.keys(object).sort().map((key) => [key.normalize('NFC'), canonicalValue(object[key])]))
  }
  throw new TypeError(`Canonical JSON does not support ${typeof value}.`)
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalValue(value))
}

export function canonicalBytes(value: unknown): Uint8Array {
  return encoder.encode(canonicalJson(value))
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function decodeJson<T>(bytes: Uint8Array): T {
  return JSON.parse(new TextDecoder().decode(bytes)) as T
}
