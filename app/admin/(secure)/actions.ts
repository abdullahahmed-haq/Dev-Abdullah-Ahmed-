'use server'

import { revalidatePath } from 'next/cache'

import { AdminCmsError, publishAdminRevision, rollbackAdminRelease, saveAdminDraft } from '../../../lib/admin/cms'

export interface AdminActionState {
  ok: boolean
  message: string
  revision?: number
  releaseId?: string
  conflict?: boolean
}

function parseDocument(value: FormDataEntryValue | null, name: string) {
  if (typeof value !== 'string') throw new Error(`${name} is required.`)
  if (value.length > 750_000) throw new Error(`${name} is too large.`)
  const parsed: unknown = JSON.parse(value)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${name} must be a JSON object.`)
  return parsed
}

function parseRevision(value: FormDataEntryValue | null) {
  const revision = Number(value)
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('A valid draft revision is required.')
  return revision
}

function actionError(error: unknown, fallback: string): AdminActionState {
  if (error instanceof AdminCmsError) return { ok: false, conflict: error.conflict, message: error.publicMessage }
  return { ok: false, message: error instanceof Error ? error.message : fallback }
}

export async function saveDraftAction(_: AdminActionState | null, formData: FormData): Promise<AdminActionState> {
  try {
    const expectedRevision = parseRevision(formData.get('revision'))
    const site = parseDocument(formData.get('site'), 'Site')
    const blog = parseDocument(formData.get('blog'), 'Blog')
    const revision = await saveAdminDraft(expectedRevision, site, blog)
    revalidatePath('/admin')
    return { ok: true, revision, message: 'Draft saved.' }
  } catch (error) {
    return actionError(error, 'Draft save failed.')
  }
}

export async function publishAction(_: AdminActionState | null, formData: FormData): Promise<AdminActionState> {
  try {
    const expectedRevision = parseRevision(formData.get('revision'))
    const result = await publishAdminRevision(expectedRevision)
    revalidatePath('/', 'layout')
    revalidatePath('/admin')
    return { ok: true, releaseId: result.releaseId, message: result.reconciled ? 'Release published.' : 'Release is live; Supabase status will reconcile on the next admin load.' }
  } catch (error) {
    return actionError(error, 'Publication failed.')
  }
}

export async function rollbackAction(_: AdminActionState | null, formData: FormData): Promise<AdminActionState> {
  try {
    const releaseId = String(formData.get('releaseId') || '')
    if (!/^\d{4}-\d{2}-\d{2}T\d{6}Z-[0-9A-HJKMNP-TV-Z]{26}$/.test(releaseId)) throw new Error('Invalid release ID.')
    await rollbackAdminRelease(releaseId)
    revalidatePath('/', 'layout')
    revalidatePath('/admin')
    return { ok: true, releaseId, message: 'Rollback complete.' }
  } catch (error) {
    return actionError(error, 'Rollback failed.')
  }
}
