// Uploaded media is served by the backend, so next/image must trust whichever
// origin NEXT_PUBLIC_SOCKET_URL points at (localhost in dev, the deployed API
// in production).
const apiOrigin = new URL(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: apiOrigin.protocol.replace(':', ''),
        hostname: apiOrigin.hostname,
        port: apiOrigin.port,
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
