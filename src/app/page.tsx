import { MagazineDesk } from "@/components/magazine-desk";
import { getMagazineFeed } from "@/lib/cached-feed";

export const dynamic = "force-dynamic";

export default async function Home() {
  const digest = await getMagazineFeed();

  return (
    <MagazineDesk
      articles={digest.articles}
      sources={digest.sources}
      fetchedAt={digest.fetchedAt}
    />
  );
}
