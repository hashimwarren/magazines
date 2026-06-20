import assert from "node:assert/strict";
import test from "node:test";
import {
  isAuthorizedCronRequest,
  isRefreshHour,
  parseFeed,
  parseHomepageLinks,
  type MagazineSource,
} from "../src/lib/magazines";

const source: MagazineSource = {
  id: "example",
  name: "Example Magazine",
  url: "https://example.com",
  feedUrl: "https://example.com/feed",
  accent: "oklch(0.6 0.1 80)",
};

test("parseFeed normalizes RSS items", () => {
  const articles = parseFeed(
    `<?xml version="1.0"?>
    <rss><channel><item>
      <title>Inside the Test Story</title>
      <link>/stories/test</link>
      <description><![CDATA[<p>A useful summary &amp; context.</p><img src="https://example.com/image.jpg" />]]></description>
      <pubDate>Sat, 20 Jun 2026 12:00:00 GMT</pubDate>
      <dc:creator>Jane Writer</dc:creator>
      <category>Tech</category>
    </item></channel></rss>`,
    source,
    "2026-06-20T13:00:00.000Z",
  );

  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, "Inside the Test Story");
  assert.equal(articles[0].url, "https://example.com/stories/test");
  assert.equal(articles[0].excerpt, "A useful summary & context.");
  assert.equal(articles[0].author, "Jane Writer");
  assert.equal(articles[0].imageUrl, "https://example.com/image.jpg");
});

test("parseHomepageLinks keeps plausible same-site story links", () => {
  const articles = parseHomepageLinks(
    `<a href="/article/one">A substantial homepage story title</a>
     <a href="https://elsewhere.test/story">A substantial external story title</a>
     <a href="/tiny">Short</a>`,
    source,
    "2026-06-20T13:00:00.000Z",
  );

  assert.equal(articles.length, 1);
  assert.equal(articles[0].url, "https://example.com/article/one");
});


test("homepage fallback removes navigation and repeated headline text", () => {
  const articles = parseHomepageLinks(
    `<a href="#main">Skip to Main Content</a>
     <a href="/membership/newsletters">Manage Newsletters</a>
     <a href="/2026/06/19/nba/story">Best Magazine Story Today Best Magazine Story Today</a>
     <a href="/creator/someone">A Person With a Long Name</a>`,
    { ...source, id: "the-ringer", name: "The Ringer", url: "https://example.com" },
    "2026-06-20T13:00:00.000Z",
  );

  assert.equal(articles.length, 1);
  assert.equal(articles[0].title, "Best Magazine Story Today");
});
test("cron auth requires the expected bearer secret", () => {
  assert.equal(isAuthorizedCronRequest("Bearer secret", "secret"), true);
  assert.equal(isAuthorizedCronRequest("Bearer wrong", "secret"), false);
  assert.equal(isAuthorizedCronRequest("Bearer secret", undefined), false);
});

test("refresh schedule follows America/New_York at 6, noon, and 5", () => {
  assert.equal(isRefreshHour(new Date("2026-01-01T11:00:00.000Z")), true);
  assert.equal(isRefreshHour(new Date("2026-01-01T17:00:00.000Z")), true);
  assert.equal(isRefreshHour(new Date("2026-01-01T22:00:00.000Z")), true);
  assert.equal(isRefreshHour(new Date("2026-06-20T10:00:00.000Z")), true);
  assert.equal(isRefreshHour(new Date("2026-06-20T11:00:00.000Z")), false);
});


