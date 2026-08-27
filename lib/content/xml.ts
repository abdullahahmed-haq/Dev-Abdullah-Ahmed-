import { siteOrigin } from '../config/server'

export function escapeXml(value: string) {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
    .replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character]!)
}

export function absoluteUrl(path: string) {
  return new URL(path.replace(/^\/+/, '/'), `${siteOrigin()}/`).toString()
}
