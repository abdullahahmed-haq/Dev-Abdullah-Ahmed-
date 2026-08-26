export const DEFAULT_PROJECT_COLOR = '#d5aa21'

export const DEFAULT_SITE_CONTENT = Object.freeze({
  profile: Object.freeze({
    name: 'عبدالله أحمد',
    role: 'مصمم ومطور واجهات',
    bio: 'أصنع تجارب رقمية هادئة وواضحة.',
    email: '',
  }),
  projects: Object.freeze([]),
  settings: Object.freeze({
    siteTitle: 'My Profile',
    availability: true,
  }),
})

function text(value, fallback = '', maxLength = 500) {
  return typeof value === 'string' ? value.slice(0, maxLength) : fallback
}

function localizedText(value, maxLength) {
  if (!value || typeof value !== 'object') return ''
  return text(value.ar, text(value.en, '', maxLength), maxLength)
}

function getLegacyProjectId(project, index) {
  const source = `${project?.title || ''}|${project?.url || ''}|${index}`
  let hash = 0

  for (const character of source) {
    hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  }

  return `project-${Math.abs(hash).toString(36)}`
}

export function normalizeSiteContent(value) {
  const source = value && typeof value === 'object' ? value : {}
  const profile = source.profile && typeof source.profile === 'object' ? source.profile : {}
  const settings = source.settings && typeof source.settings === 'object' ? source.settings : {}
  const projects = Array.isArray(source.projects) ? source.projects.slice(0, 250) : []

  return {
    profile: {
      name: text(profile.name, DEFAULT_SITE_CONTENT.profile.name, 120),
      role: text(profile.role, DEFAULT_SITE_CONTENT.profile.role, 160),
      bio: text(profile.bio, DEFAULT_SITE_CONTENT.profile.bio, 1000),
      email: text(profile.email, DEFAULT_SITE_CONTENT.profile.email, 254),
    },
    projects: projects.map((project, index) => {
      const document = project?.document && typeof project.document === 'object' ? project.document : undefined

      return {
        ...(document ? { document } : {}),
        id: text(project?.id, getLegacyProjectId(project, index), 120) || getLegacyProjectId(project, index),
        title: text(project?.title, localizedText(document?.title, 180), 180),
        type: text(project?.type, localizedText(document?.category, 120), 120),
        url: text(project?.url, text(document?.externalUrl, '', 1000), 1000),
        color: /^#[0-9a-f]{6}$/i.test(project?.color || '') ? project.color : DEFAULT_PROJECT_COLOR,
      }
    }),
    settings: {
      siteTitle: text(settings.siteTitle, DEFAULT_SITE_CONTENT.settings.siteTitle, 160),
      availability: typeof settings.availability === 'boolean'
        ? settings.availability
        : DEFAULT_SITE_CONTENT.settings.availability,
    },
  }
}
