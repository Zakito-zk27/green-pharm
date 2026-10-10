import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    resolveAlias: {
      // What `createNextIntlPlugin` would add. We set it directly because the plugin
      // eagerly loads @swc/core (only needed for next-intl's experimental message
      // extractor), whose native binary refuses to load on Windows. See docs/DECISIONS.md.
      "next-intl/config": "./src/i18n/request.ts",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
