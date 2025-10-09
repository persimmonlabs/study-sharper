/** @type {import('next').NextConfig} */
const nextConfig = {
    // Note: API routes are now handled by Next.js API routes in src/app/api/
    // which proxy to the backend. The BACKEND_API_URL environment variable
    // controls where requests are forwarded (localhost for dev, deployed URL for prod)
}

module.exports = nextConfig
