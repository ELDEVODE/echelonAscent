import { createCivicAuthPlugin } from "@civic/auth-web3/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        assert: false,
        http: false,
        https: false,
        os: false,
        url: false,
        zlib: false,
      };
    }

    // Handle bigint issues
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
    };

    // Ignore specific modules that cause issues
    config.externals = config.externals || [];
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });

    return config;
  },
  experimental: {
    esmExternals: 'loose',
  },
};

const withCivicAuth = createCivicAuthPlugin({
  clientId: process.env.CIVIC_AUTH_CLIENT_ID as string,
  loginUrl: "/login", // Redirect unauthenticated users to login page
})

export default withCivicAuth(nextConfig);
