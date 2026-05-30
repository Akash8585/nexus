import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import { getPageMap } from 'nextra/page-map'
import type { ReactNode } from 'react'

const navbar = (
  <Navbar
    logo={
      <span style={{ fontWeight: 700, letterSpacing: '0.08em', color: '#00D992' }}>
        NEXUS
      </span>
    }
    projectLink="https://github.com/Akash8585/nexus"
  />
)

const footer = (
  <Footer>
    MIT {new Date().getFullYear()} ©{' '}
    <a href="https://github.com/Akash8585/nexus" style={{ color: '#00D992' }}>
      Nexus
    </a>
  </Footer>
)

export default async function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <Layout
      navbar={navbar}
      footer={footer}
      pageMap={await getPageMap()}
      docsRepositoryBase="https://github.com/Akash8585/nexus/tree/main/docs"
      nextThemes={{ defaultTheme: 'dark', storageKey: 'nexus-docs-theme' }}
      darkMode
    >
      {children}
    </Layout>
  )
}
