/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,
  output: 'standalone',
  images: {
    domains: ['localhost', 'calling-agent-frontend-five.vercel.app'],
  }
}

module.exports = nextConfig