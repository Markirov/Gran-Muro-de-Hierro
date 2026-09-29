/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  // optional: disable image optimization for static export
  images: { unoptimized: true },
};

module.exports = nextConfig;
