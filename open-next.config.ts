import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No Next.js data cache: every page reads the database directly (D1 is fast and close to visitors),
// so admin changes appear on the store immediately.
export default defineCloudflareConfig({});
