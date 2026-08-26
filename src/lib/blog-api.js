async function readResponse(response) {
  const body = response.status === 204 ? null : await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body?.message || 'Unable to complete the blog request.')
    error.status = response.status
    error.code = body?.code
    error.tag = response.headers.get('etag')
    throw error
  }
  return { body, tag: response.headers.get('etag') }
}

export async function getBlogPosts(locale, filters = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key === 'query' ? 'q' : key, value)
  const query = params.size ? `?${params}` : ''
  const response = await fetch(`/api/blog/${locale}/posts${query}`, { credentials: 'same-origin' })
  return (await readResponse(response)).body
}

export async function getBlogPost(locale, slug) {
  const response = await fetch(`/api/blog/${locale}/posts/${encodeURIComponent(slug)}`, { credentials: 'same-origin' })
  return readResponse(response)
}

export async function getAdminBlogPosts() {
  const response = await fetch('/api/admin/blog/posts', { credentials: 'same-origin' })
  return (await readResponse(response)).body.posts
}

export async function createBlogPost(post) {
  const response = await fetch('/api/admin/blog/posts', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(post),
  })
  return readResponse(response)
}

export async function updateBlogPost(post, tag) {
  const response = await fetch(`/api/admin/blog/posts/${encodeURIComponent(post.id)}`, {
    method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'If-Match': tag || '' }, body: JSON.stringify(post),
  })
  return readResponse(response)
}

export async function deleteBlogPost(id, tag) {
  const response = await fetch(`/api/admin/blog/posts/${encodeURIComponent(id)}`, {
    method: 'DELETE', credentials: 'same-origin', headers: { 'If-Match': tag || '' },
  })
  return readResponse(response)
}

export async function uploadBlogMedia(file) {
  const response = await fetch('/api/admin/blog/media', {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type, 'X-Filename': encodeURIComponent(file.name) }, body: await file.arrayBuffer(),
  })
  return (await readResponse(response)).body
}
