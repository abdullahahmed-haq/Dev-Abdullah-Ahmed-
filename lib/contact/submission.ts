import { z } from 'zod'

import { PublicHttpError } from '../http/errors'

const contactSchema = z.object({
  name: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(254),
  company: z.string().trim().max(160).optional().default(''),
  projectType: z.string().trim().max(120).optional().default(''),
  message: z.string().trim().min(1).max(5000),
  locale: z.enum(['en', 'ar']),
  turnstileToken: z.string().min(1).max(4096),
}).strict()

export type ContactSubmission = z.infer<typeof contactSchema>

export interface ChallengeVerifier {
  verify(token: string, ip: string): Promise<boolean>
}

export interface ContactMessageRepository {
  create(message: Omit<ContactSubmission, 'turnstileToken'>, ipHash: string): Promise<'created' | 'rate-limited'>
}

async function hashIdentifier(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** One-use-case module: validation, bot verification, privacy hashing, and persistence. */
export class ContactSubmissionService {
  constructor(
    private readonly verifier: ChallengeVerifier,
    private readonly repository: ContactMessageRepository,
    private readonly rateSalt: string,
  ) {}

  async submit(input: unknown, ip: string): Promise<void> {
    const parsed = contactSchema.safeParse(input)
    if (!parsed.success) {
      throw new PublicHttpError(400, 'INVALID_CONTACT', 'Please check the form fields.')
    }

    let verified = false
    try {
      verified = await this.verifier.verify(parsed.data.turnstileToken, ip)
    } catch (error) {
      throw new PublicHttpError(503, 'CONTACT_UNAVAILABLE', 'Contact is temporarily unavailable.', { cause: error })
    }
    if (!verified) {
      throw new PublicHttpError(403, 'TURNSTILE_FAILED', 'Verification failed. Please try again.')
    }

    const { turnstileToken: _discardedToken, ...message } = parsed.data
    const ipHash = await hashIdentifier(`${this.rateSalt}:${ip}`)
    const result = await this.repository.create(message, ipHash)
    if (result === 'rate-limited') {
      throw new PublicHttpError(429, 'CONTACT_RATE_LIMITED', 'Too many messages. Please try again later.')
    }
  }
}
