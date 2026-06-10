import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000'

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND}/api/:path*`,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
