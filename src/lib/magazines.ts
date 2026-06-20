import { XMLParser } from "fast-xml-parser";

export type MagazineSource = {
  id: string;
  name: string;
  url: string;
  feedUrl: string;
  accent: string;
};

export type MagazineArticle = {
  id: string;
  source: string;
  sourceId: string;
  title: string;
  url: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  imageUrl: string | null;
  category: string;
  fetchedAt: string;
};

export type FeedSourceResult = {
  source: MagazineSource;
  articles: MagazineArticle[];
  error?: string;
};

export type MagazineFeedSnapshot = {
  articles: MagazineArticle[];
  sources: FeedSourceResult[];
  fetchedAt: string;
};

type ParsedXmlNode = Record<string, unknown>;

const parser = new XMLParser({
  attributeNamePrefix: "@_",
  ignoreAttributes: false,
  parseTagValue: false,
  trimValues: true,
});

export const FEED_CACHE_TAG = "magazine-feeds";

export const MAGAZINE_SOURCES: MagazineSource[] = [
  {
    id: "daily-beast",
    name: "The Daily Beast",
    url: "https://www.thedailybeast.com",
    feedUrl: "https://www.thedailybeast.com/feed/rss",
    accent: "oklch(0.61 0.19 24)",
  },
  {
    id: "defector",
    name: "Defector",
    url: "https://defector.com",
    feedUrl: "https://defector.com/feed",
    accent: "oklch(0.6 0.16 145)",
  },
  {
    id: "the-verge",
    name: "The Verge",
    url: "https://www.theverge.com",
    feedUrl: "https://www.theverge.com/rss/index.xml",
    accent: "oklch(0.63 0.21 318)",
  },
  {
    id: "the-ringer",
    name: "The Ringer",
    url: "https://www.theringer.com",
    feedUrl: "https://www.theringer.com/rss/index.xml",
    accent: "oklch(0.58 0.18 250)",
  },
  {
    id: "404-media",
    name: "404 Media",
    url: "https://www.404media.co",
    feedUrl: "https://www.404media.co/rss/",
    accent: "oklch(0.58 0.17 72)",
  },
  {
    id: "the-bulwark",
    name: "The Bulwark",
    url: "https://www.thebulwark.com",
    feedUrl: "https://www.thebulwark.com/feed",
    accent: "oklch(0.52 0.14 255)",
  },
  {
    id: "the-19th",
    name: "The 19th",
    url: "https://19thnews.org",
    feedUrl: "https://19thnews.org/feed/",
    accent: "oklch(0.58 0.17 355)",
  },
  {
    id: "puck",
    name: "Puck",
    url: "https://puck.news",
    feedUrl: "https://puck.news/feed/",
    accent: "oklch(0.57 0.13 85)",
  },
];

export function isRefreshHour(date = new Date(), timeZone = "America/New_York") {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(date),
  );

  return [6, 12, 17].includes(hour);
}

export function isAuthorizedCronRequest(
  authorizationHeader: string | null,
  cronSecret = process.env.CRON_SECRET,
) {
  if (!cronSecret) {
    return false;
  }

  return authorizationHeader === `Bearer ${cronSecret}`;
}

export async function refreshMagazineFeeds(): Promise<MagazineFeedSnapshot> {
  const fetchedAt = new Date().toISOString();
  const sources = await Promise.all(
    MAGAZINE_SOURCES.map(async (source) => fetchSource(source, fetchedAt)),
  );
  const articles = sources
    .flatMap((source) => source.articles)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

  return { articles, sources, fetchedAt };
}

export async function fetchSource(
  source: MagazineSource,
  fetchedAt: string,
): Promise<FeedSourceResult> {
  try {
    const response = await fetch(source.feedUrl, {
      headers: {
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
        "user-agent": "Magazine Desk/1.0 (+https://magazines.goofy.computer)",
      },
      next: { revalidate: 60 * 60 * 6, tags: [FEED_CACHE_TAG] },
    });

    if (!response.ok) {
      throw new Error(`RSS returned ${response.status}`);
    }

    const xml = await response.text();
    const articles = parseFeed(xml, source, fetchedAt).slice(0, 12);

    if (articles.length === 0) {
      throw new Error("RSS returned no articles");
    }

    return { source, articles };
  } catch (error) {
    const fallback = await fetchHomepageFallback(source, fetchedAt);
    return {
      source,
      articles: fallback,
      error:
        error instanceof Error
          ? `${error.message}${fallback.length ? "; using homepage fallback" : ""}`
          : "Unknown RSS error",
    };
  }
}

export function parseFeed(
  xml: string,
  source: MagazineSource,
  fetchedAt: string,
): MagazineArticle[] {
  const parsed = parser.parse(xml) as ParsedXmlNode;
  const channel = asObject(asObject(parsed.rss).channel);
  const rssItems = toArray(channel.item);
  const atomEntries = toArray(asObject(parsed.feed).entry);
  const items = rssItems.length ? rssItems : atomEntries;

  return items
    .map((item, index) => normalizeItem(asObject(item), source, fetchedAt, index))
    .filter((article): article is MagazineArticle => Boolean(article));
}

async function fetchHomepageFallback(
  source: MagazineSource,
  fetchedAt: string,
): Promise<MagazineArticle[]> {
  try {
    const response = await fetch(source.url, {
      headers: {
        accept: "text/html",
        "user-agent": "Magazine Desk/1.0 (+https://magazines.goofy.computer)",
      },
      next: { revalidate: 60 * 60 * 6, tags: [FEED_CACHE_TAG] },
    });

    if (!response.ok) {
      return [];
    }

    const html = await response.text();
    return parseHomepageLinks(html, source, fetchedAt).slice(0, 8);
  } catch {
    return [];
  }
}

export function parseHomepageLinks(
  html: string,
  source: MagazineSource,
  fetchedAt: string,
): MagazineArticle[] {
  const seen = new Set<string>();
  const articles: MagazineArticle[] = [];
  const linkPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(html)) && articles.length < 12) {
    const url = toAbsoluteUrl(match[1], source.url);
    const title = stripHtml(match[2]);

    if (!isLikelyArticleLink(url, title, source) || seen.has(url)) {
      continue;
    }

    seen.add(url);
    articles.push({
      id: stableId(`${source.id}:${url}`),
      source: source.name,
      sourceId: source.id,
      title,
      url,
      excerpt: "Latest story from the publication homepage.",
      author: source.name,
      publishedAt: fetchedAt,
      imageUrl: null,
      category: "Latest",
      fetchedAt,
    });
  }

  return articles;
}

function normalizeItem(
  item: ParsedXmlNode,
  source: MagazineSource,
  fetchedAt: string,
  index: number,
): MagazineArticle | null {
  const title = stripHtml(textValue(item.title));
  const url = resolveItemUrl(item, source.url);

  if (!title || !url) {
    return null;
  }

  const publishedAt =
    parseDate(
      textValue(item.pubDate) ||
        textValue(item.published) ||
        textValue(item.updated) ||
        textValue(item["dc:date"]),
    ) || fetchedAt;

  return {
    id: stableId(textValue(item.guid) || `${source.id}:${url}:${index}`),
    source: source.name,
    sourceId: source.id,
    title,
    url,
    excerpt: stripHtml(
      textValue(item.description) ||
        textValue(item.summary) ||
        textValue(item["content:encoded"]),
    ).slice(0, 260),
    author:
      stripHtml(
        textValue(item.author) ||
          textValue(item["dc:creator"]) ||
          textValue(asObject(item.author).name),
      ) || source.name,
    publishedAt,
    imageUrl: extractImageUrl(item),
    category:
      stripHtml(textValue(toArray(item.category)[0]) || textValue(item.category)) ||
      "Latest",
    fetchedAt,
  };
}

function resolveItemUrl(item: ParsedXmlNode, baseUrl: string) {
  const link = item.link;
  if (typeof link === "string") {
    return toAbsoluteUrl(link, baseUrl);
  }

  const linkObjects = toArray(link).map(asObject);
  const alternate = linkObjects.find(
    (entry) => textValue(entry["@_rel"]) === "alternate" || !entry["@_rel"],
  );

  return toAbsoluteUrl(
    textValue(alternate?.["@_href"]) || textValue(item.guid),
    baseUrl,
  );
}

function extractImageUrl(item: ParsedXmlNode) {
  const mediaContent = toArray(item["media:content"]).map(asObject);
  const mediaThumbnail = toArray(item["media:thumbnail"]).map(asObject);
  const enclosure = asObject(item.enclosure);
  const candidate =
    textValue(mediaContent[0]?.["@_url"]) ||
    textValue(mediaThumbnail[0]?.["@_url"]) ||
    textValue(enclosure["@_url"]) ||
    imageFromHtml(textValue(item.description) || textValue(item["content:encoded"]));

  return candidate || null;
}

function imageFromHtml(html: string) {
  return html.match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1] ?? "";
}

function parseDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString();
}

function toAbsoluteUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

function stripHtml(value: string) {
  return dedupeRepeatedText(
    decodeEntities(value.replace(/<[^>]*>/g, " "))
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function isLikelyArticleLink(url: string, title: string, source: MagazineSource) {
  if (!url || title.length < 18) {
    return false;
  }

  const normalizedTitle = title.toLowerCase();
  if (
    normalizedTitle.includes("skip to main content") ||
    normalizedTitle.includes("become a subscriber") ||
    normalizedTitle.includes("manage newsletters") ||
    normalizedTitle.includes("play our crossword")
  ) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const sourceUrl = new URL(source.url);
    const path = parsed.pathname.toLowerCase();

    if (parsed.hostname !== sourceUrl.hostname) {
      return false;
    }

    if (
      path.startsWith("/author/") ||
      path.startsWith("/creator/") ||
      path.startsWith("/membership") ||
      path.startsWith("/crossword") ||
      path === "/" ||
      path === "/cheat-sheet/"
    ) {
      return false;
    }

    if (source.id === "the-ringer") {
      return /\/20\d{2}\/\d{2}\/\d{2}\//.test(path);
    }

    return path.split("/").filter(Boolean).length >= 1;
  } catch {
    return false;
  }
}

function dedupeRepeatedText(value: string) {
  const words = value.split(" ").filter(Boolean);

  for (let length = 3; length <= Math.floor(words.length / 2); length += 1) {
    const prefix = words.slice(0, length).join(" ");
    const next = words.slice(length, length * 2).join(" ");

    if (normalizeForRepeat(prefix) === normalizeForRepeat(next)) {
      return prefix;
    }
  }

  return value;
}

function normalizeForRepeat(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function decodeEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );
}

function textValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object" && "#text" in value) {
    return textValue((value as ParsedXmlNode)["#text"]);
  }

  return "";
}

function asObject(value: unknown): ParsedXmlNode {
  return value && typeof value === "object" ? (value as ParsedXmlNode) : {};
}

function toArray(value: unknown): unknown[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function stableId(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return `article-${Math.abs(hash).toString(36)}`;
}




