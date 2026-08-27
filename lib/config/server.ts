import 'server-only'

export class ConfigurationError extends Error {
  constructor(readonly variable: string) {
    super(`Required server configuration is missing: ${variable}.`)
    this.name = 'ConfigurationError'
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new ConfigurationError(name)
  return value
}

function normalizedUrl(name: string, value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new ConfigurationError(name)
  }
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new ConfigurationError(name)
  }
  return url.origin
}

export function optionalPublicSupabaseConfig(): { url: string; publishableKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !publishableKey) return null
  return { url: normalizedUrl('NEXT_PUBLIC_SUPABASE_URL', url), publishableKey }
}

export function publicSupabaseConfig() {
  const config = optionalPublicSupabaseConfig()
  if (!config) throw new ConfigurationError('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  return config
}

export function serviceSupabaseConfig() {
  return {
    url: normalizedUrl('SUPABASE_URL', required('SUPABASE_URL')),
    secretKey: required('SUPABASE_SECRET_KEY'),
  }
}

export function cloudinaryConfig() {
  return {
    cloudName: required('CLOUDINARY_CLOUD_NAME'),
    apiKey: required('CLOUDINARY_API_KEY'),
    apiSecret: required('CLOUDINARY_API_SECRET'),
  }
}

export function contactProtectionConfig() {
  return {
    turnstileSecret: required('TURNSTILE_SECRET_KEY'),
    rateSalt: required('CONTACT_RATE_SALT'),
  }
}

export function siteOrigin(options: { required?: boolean; fallback?: string } = {}): string {
  const configured = process.env.NEXT_PUBLIC_SITE_ORIGIN?.trim()
  if (configured) return normalizedUrl('NEXT_PUBLIC_SITE_ORIGIN', configured)
  if (options.fallback) return normalizedUrl('NEXT_PUBLIC_SITE_ORIGIN', options.fallback)
  if (options.required) throw new ConfigurationError('NEXT_PUBLIC_SITE_ORIGIN')
  return process.env.NODE_ENV === 'production' ? 'https://portfolio.example' : 'http://localhost:3000'
}
