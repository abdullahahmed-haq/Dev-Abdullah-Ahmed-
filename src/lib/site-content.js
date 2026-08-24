const STORAGE_KEY = 'my-profile-site-content'

const defaultContent = {
  profile: {
    name: 'عبدالله أحمد',
    role: 'مصمم ومطور واجهات',
    bio: 'أصنع تجارب رقمية هادئة وواضحة.',
    email: '',
  },
  projects: [],
  settings: {
    siteTitle: 'My Profile',
    availability: true,
  },
}

export function getSiteContent() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return defaultContent

    const parsed = JSON.parse(stored)
    return {
      ...defaultContent,
      ...parsed,
      profile: { ...defaultContent.profile, ...parsed.profile },
      settings: { ...defaultContent.settings, ...parsed.settings },
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    }
  } catch {
    return defaultContent
  }
}

export function saveSiteContent(content) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(content))
  window.dispatchEvent(new Event('site-content-updated'))
}
