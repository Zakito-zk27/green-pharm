import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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

// Gives `next dev` the Cloudflare bindings (local D1 database) from wrangler.jsonc.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
