/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['nodemailer', 'multer'],
  },
  api: {
    bodyParser: false,
  },
}

module.exports = nextConfig
