import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs'
import { Callout, Tabs } from 'nextra/components'
import type { ReactNode } from 'react'

const themeComponents = getThemeComponents()

export function Note({ children }: { children: ReactNode }) {
  return <Callout type="info">{children}</Callout>
}

export function Warning({ children }: { children: ReactNode }) {
  return <Callout type="warning">{children}</Callout>
}

export function Tip({ children }: { children: ReactNode }) {
  return <Callout type="default">{children}</Callout>
}

export function Info({ children }: { children: ReactNode }) {
  return <Callout type="info">{children}</Callout>
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '1rem',
        margin: '1.5rem 0',
      }}
    >
      {children}
    </div>
  )
}

export function StatCard({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div
      style={{
        border: '1px solid #3d3a39',
        borderRadius: '8px',
        background: '#1a1a1a',
        padding: '1rem',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#00d992' }}>{value}</div>
      <div style={{ fontSize: '0.875rem', color: '#bdbdbd', marginTop: '0.25rem' }}>{label}</div>
    </div>
  )
}

export function Screenshot({ caption }: { caption: string }) {
  return (
    <figure style={{ margin: '1.5rem 0' }}>
      <div
        style={{
          border: '1px solid #3d3a39',
          borderRadius: '8px',
          background: '#1a1a1a',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8b949e',
          fontSize: '0.875rem',
        }}
      >
        {caption}
      </div>
      <figcaption style={{ textAlign: 'center', color: '#8b949e', marginTop: '0.5rem', fontSize: '0.875rem' }}>
        {caption}
      </figcaption>
    </figure>
  )
}

export function useMDXComponents(components?: Record<string, unknown>) {
  return {
    ...themeComponents,
    Callout,
    Tabs,
    Note,
    Warning,
    Tip,
    Info,
    StatGrid,
    StatCard,
    Screenshot,
    ...components,
  }
}
