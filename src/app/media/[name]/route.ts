import { getMedia } from "@/lib/server/db";

/** Serves images uploaded from the admin (products, logo, banners). */
export async function GET(_req: Request, ctx: RouteContext<"/media/[name]">) {
  const { name } = await ctx.params;
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(name)) return new Response("Not found", { status: 404 });
  const file = await getMedia(name);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(file.bytes as BodyInit, {
    headers: {
      "content-type": file.type,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
