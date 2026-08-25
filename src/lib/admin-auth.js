let authenticated = false

function notifyAuthChange() {
  window.dispatchEvent(new Event('admin-auth-changed'))
}

export function isAdminSession() {
  return authenticated
}

async function readResponse(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(body.message || 'Authentication failed.')
    error.code = body.code
    error.status = response.status
    throw error
  }
  return body
}

export async function refreshAdminSession() {
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin' })
    const body = await readResponse(response)
    authenticated = Boolean(body.authenticated)
  } catch {
    authenticated = false
  }
  notifyAuthChange()
  return authenticated
}

export async function loginAdmin(username, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim(), password }),
  })
  const body = await readResponse(response)
  authenticated = Boolean(body.authenticated)
  localStorage.removeItem('my-profile-admin-credentials')
  sessionStorage.removeItem('my-profile-admin-session')
  notifyAuthChange()
  return authenticated
}

export async function logoutAdmin() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } finally {
    authenticated = false
    notifyAuthChange()
  }
}
