import 'server-only'

import { z } from 'zod'

import { contactProtectionConfig } from '../config/server'
import { createSupabaseServiceClient } from '../supabase/server'
import { ContactSubmissionService, type ChallengeVerifier, type ContactMessageRepository } from './submission'

const turnstileResponseSchema = z.object({ success: z.boolean() }).passthrough()

function turnstileVerifier(secret: string): ChallengeVerifier {
  return {
    async verify(token, ip) {
      const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) })
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body,
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5_000),
      })
      if (!response.ok) throw new Error(`Turnstile verification returned HTTP ${response.status}.`)
      return turnstileResponseSchema.parse(await response.json()).success
    },
  }
}

function contactRepository(): ContactMessageRepository {
  return {
    async create(message, ipHash) {
      const { error } = await createSupabaseServiceClient().rpc('submit_contact_message', {
        input_name: message.name,
        input_email: message.email,
        input_company: message.company,
        input_project_type: message.projectType,
        input_message: message.message,
        input_locale: message.locale,
        input_ip_hash: ipHash,
      })
      if (!error) return 'created'
      if (error.code === '42901') return 'rate-limited'
      throw new Error('Contact message persistence failed.', { cause: error })
    },
  }
}

export function createContactSubmissionService(): ContactSubmissionService {
  const config = contactProtectionConfig()
  return new ContactSubmissionService(turnstileVerifier(config.turnstileSecret), contactRepository(), config.rateSalt)
}
