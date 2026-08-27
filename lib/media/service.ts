import 'server-only'

import { z } from 'zod'

import { getAdmin } from '../admin/authorization'
import { cloudinaryConfig } from '../config/server'
import { PublicHttpError } from '../http/errors'
import { createSupabaseServiceClient } from '../supabase/server'
import { createUploadSignature, isOwnedCloudinaryAsset } from './cloudinary'

export const mediaSignatureInputSchema = z.object({
  resourceType: z.enum(['image', 'video']),
}).strict()

export const mediaRegistrationInputSchema = z.object({
  publicId: z.string().regex(/^portfolio\/[A-Za-z0-9_\-/]+$/).max(400),
  secureUrl: z.string().url().max(2000),
  resourceType: z.enum(['image', 'video']),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  bytes: z.number().int().positive().max(200 * 1024 * 1024).optional(),
  alt: z.string().trim().max(500),
}).strict()

async function requireApiAdmin() {
  const admin = await getAdmin()
  if (!admin) throw new PublicHttpError(401, 'UNAUTHORIZED', 'Unauthorized.')
  return admin
}

export async function signMediaUpload(input: z.infer<typeof mediaSignatureInputSchema>) {
  await requireApiAdmin()
  const config = cloudinaryConfig()
  const signed = await createUploadSignature(input.resourceType, config.apiSecret)
  return { ...signed, cloudName: config.cloudName, apiKey: config.apiKey }
}

export async function registerMediaAsset(input: z.infer<typeof mediaRegistrationInputSchema>): Promise<void> {
  const { userId } = await requireApiAdmin()
  const config = cloudinaryConfig()
  if (!isOwnedCloudinaryAsset(input.secureUrl, config.cloudName, input.publicId, input.resourceType)) {
    throw new PublicHttpError(400, 'INVALID_MEDIA_ASSET', 'The media URL does not match the signed portfolio asset.')
  }

  const { error } = await createSupabaseServiceClient().from('media_assets').upsert({
    public_id: input.publicId,
    secure_url: input.secureUrl,
    resource_type: input.resourceType,
    width: input.width ?? null,
    height: input.height ?? null,
    bytes: input.bytes ?? null,
    alt: input.alt,
    created_by: userId,
  }, { onConflict: 'public_id' })
  if (error) {
    throw new PublicHttpError(503, 'MEDIA_UNAVAILABLE', 'Media registration is temporarily unavailable.', { cause: error })
  }
}
