import type { MetaRecord } from 'nextra'

const meta: MetaRecord = {
  index: {
    title: 'Nexus',
    display: 'hidden',
  },
  '---introduction': { type: 'separator', title: 'Introduction' },
  introduction: 'What is Nexus?',
  quickstart: 'Quickstart',
  '---core-concepts': { type: 'separator', title: 'Core Concepts' },
  concepts: 'Core Concepts',
  '---sdk': { type: 'separator', title: 'SDK' },
  sdk: 'SDK Reference',
  '---api': { type: 'separator', title: 'API Reference' },
  api: 'API Reference',
  '---guides': { type: 'separator', title: 'Guides' },
  guides: 'Guides',
  '---dashboard': { type: 'separator', title: 'Dashboard' },
  dashboard: 'Dashboard',
  '---deployment': { type: 'separator', title: 'Deployment' },
  deployment: 'Deployment',
  '---more': { type: 'separator', title: 'More' },
  faq: 'FAQ',
  contributing: 'Contributing',
}

export default meta
