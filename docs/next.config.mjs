import nextra from 'nextra'

const withNextra = nextra({
  search: true,
  defaultShowCopyCode: true,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default withNextra(nextConfig)
