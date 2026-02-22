/** @type {import('next').NextConfig} */
const nextConfig = {
  // Generate unique build ID to help with chunk caching
  generateBuildId: async () => {
    return Date.now().toString(36);
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
}

module.exports = nextConfig