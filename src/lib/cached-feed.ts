import { unstable_cache } from "next/cache";
import { FEED_CACHE_TAG, refreshMagazineFeeds } from "@/lib/magazines";

export const getMagazineFeed = unstable_cache(
  refreshMagazineFeeds,
  ["magazine-feed-snapshot"],
  {
    revalidate: 60 * 60 * 4,
    tags: [FEED_CACHE_TAG],
  },
);

