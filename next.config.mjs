/** @type {import('next').NextConfig} */
// pdf-parse (used by /api/finance/statement-extract to read PDF statements)
// needs its native canvas dependency kept out of the serverless bundler so
// it runs correctly on Vercel — without this, PDF text extraction fails
// with "DOMMatrix is not defined".
const nextConfig = { poweredByHeader: false, serverExternalPackages: ['pdf-parse', '@napi-rs/canvas'] }
export default nextConfig
