/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      instrumentationHook: true,
    },
    webpack: (config) => {
      config.resolve.fallback = {
        ...config.resolve.fallback, // Add existing fallbacks
        dgram: false, // Ignore 'dgram' module for client-side
      };
      return config;
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: '0zyjlta8u9.ufs.sh',
          pathname: '/**',
        },
      ],
    },    
}

module.exports = nextConfig
