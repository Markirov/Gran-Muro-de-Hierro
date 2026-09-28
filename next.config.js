/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // optional: disable image optimization for static export
  images: { unoptimized: true },
};

module.exports = nextConfig;
