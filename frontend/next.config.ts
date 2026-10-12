import type { NextConfig } from 'next'
import path from 'node:path'

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // В репозитории два package-lock.json (корень приложения и сайт),
  // поэтому корень трейсинга задаём явно — иначе Next ругается на сборку.
  outputFileTracingRoot: path.join(__dirname),
}

export default config