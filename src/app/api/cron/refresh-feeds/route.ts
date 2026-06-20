import { revalidateTag } from "next/cache";
import { getMagazineFeed } from "@/lib/cached-feed";
import { FEED_CACHE_TAG, isAuthorizedCronRequest, isRefreshHour } from "@/lib/magazines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request.headers.get("authorization"))) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  if (!isRefreshHour(now)) {
    return Response.json({
      ok: true,
      skipped: true,
      reason: "Outside scheduled refresh hours",
    });
  }

  revalidateTag(FEED_CACHE_TAG, { expire: 0 });
  const digest = await getMagazineFeed();

  return Response.json({
    ok: true,
    skipped: false,
    fetchedAt: digest.fetchedAt,
    articleCount: digest.articles.length,
    sources: digest.sources.map((source) => ({
      name: source.source.name,
      count: source.articles.length,
      error: source.error ?? null,
    })),
  });
}
