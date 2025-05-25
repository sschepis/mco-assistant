import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Handle .node files (native modules like LanceDB)
    config.module.rules.push({
      test: /\.node$/,
      use: 'raw-loader',
    });

    // Handle WASM files for TensorFlow.js
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    // Exclude native modules from client-side bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        util: false,
        url: false,
        assert: false,
        buffer: false,
        process: false,
      };

      // Exclude LanceDB and other server-only packages from client bundle
      config.externals = [
        ...(config.externals || []),
        '@lancedb/lancedb',
        'apache-arrow',
        'cheerio',
        'puppeteer',
        'playwright',
        // Exclude TensorFlow.js from client bundle to avoid WASM issues
        '@energetic-ai/embeddings',
        '@energetic-ai/model-embeddings-en',
      ];
    }

    // Handle native dependencies for server-side
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        // Allow LanceDB to be bundled on server side but handle .node files
        {
          '@lancedb/lancedb': '@lancedb/lancedb',
          'apache-arrow': 'apache-arrow',
        }
      ];
    }

    return config;
  },
  experimental: {
    esmExternals: 'loose',
  },
  // Handle static file serving and WASM files
  assetPrefix: process.env.NODE_ENV === 'production' ? undefined : '',
  
  // Ensure WASM files are properly served
  async headers() {
    return [
      {
        source: '/_next/static/(.*)\\.wasm$',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
