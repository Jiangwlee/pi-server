const PI_SERVER_URL = process.env.PI_SERVER_URL ?? 'http://127.0.0.1:3000'

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${PI_SERVER_URL}/:path*`,
      },
    ]
  },
}

export default nextConfig
