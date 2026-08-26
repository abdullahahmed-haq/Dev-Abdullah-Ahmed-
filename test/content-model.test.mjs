import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeSiteContent } from '../src/lib/content-model.js'

test('normalizes v2 project documents for the works page', () => {
  const content = normalizeSiteContent({
    projects: [{
      schemaVersion: 2,
      id: 'project-1',
      color: '#d5aa21',
      document: {
        title: { ar: 'مشروع ليبي', en: 'Libyan project' },
        category: { ar: 'هوية بصرية', en: 'Brand identity' },
        externalUrl: 'https://example.com',
      },
    }],
  })

  assert.deepEqual(
    {
      id: content.projects[0].id,
      title: content.projects[0].title,
      type: content.projects[0].type,
      url: content.projects[0].url,
      color: content.projects[0].color,
    },
    {
      id: 'project-1',
      title: 'مشروع ليبي',
      type: 'هوية بصرية',
      url: 'https://example.com',
      color: '#d5aa21',
    },
  )
  assert.deepEqual(content.projects[0].document.title, { ar: 'مشروع ليبي', en: 'Libyan project' })
})
