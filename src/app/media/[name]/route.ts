import { promises as fs } from "node:fs";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/server/db";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Serves images uploaded from the admin (products, logo, banners). */
export async function GET(_req: Request, ctx: RouteContext<"/media/[name]">) {
  const { name } = await ctx.params;
  const m = /^[\w-]+\.(jpg|png|webp)$/.exec(name);
  if (!m) return new Response("Not found", { status: 404 });
  try {
    const body = await fs.readFile(path.join(UPLOAD_DIR, name));
    return new Response(new Uint8Array(body), {
      headers: {
        "content-type": TYPES[m[1]],
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
