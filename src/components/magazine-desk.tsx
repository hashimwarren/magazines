"use client";

import { useMemo, useState } from "react";
import { AlertCircleIcon, ExternalLinkIcon, RefreshCwIcon } from "lucide-react";
import type { FeedSourceResult, MagazineArticle } from "@/lib/magazines";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

type MagazineDeskProps = {
  articles: MagazineArticle[];
  sources: FeedSourceResult[];
  fetchedAt: string;
};

export function MagazineDesk({
  articles,
  sources,
  fetchedAt,
}: MagazineDeskProps) {
  const [sourceId, setSourceId] = useState("all");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () =>
      Array.from(new Set(articles.map((article) => article.category)))
        .filter(Boolean)
        .slice(0, 8),
    [articles],
  );

  const filteredArticles = articles.filter(
    (article) =>
      (sourceId === "all" || article.sourceId === sourceId) &&
      (category === "all" || article.category === category),
  );

  const leadStory = filteredArticles[0] ?? articles[0];
  const latest = filteredArticles.slice(1, 7);
  const remaining = filteredArticles.slice(7);
  const sourceErrors = sources.filter((source) => source.error);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b bg-[oklch(0.965_0.012_83)]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex max-w-3xl flex-col gap-3">
              <Badge className="w-fit" variant="secondary">
                Magazine Desk
              </Badge>
              <h1 className="text-4xl font-semibold tracking-normal text-balance sm:text-6xl">
                A single front page for the magazines you actually read.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                The newest public stories from eight favorite publications,
                grouped for scanning and refreshed three times a day.
              </p>
            </div>
            <RefreshStatus fetchedAt={fetchedAt} articleCount={articles.length} />
          </div>
          <FilterBar
            sourceId={sourceId}
            setSourceId={setSourceId}
            category={category}
            setCategory={setCategory}
            sources={sources}
            categories={categories}
          />
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        {sourceErrors.length > 0 ? <FeedErrorNotice sources={sourceErrors} /> : null}

        {leadStory ? (
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <LeadStory article={leadStory} />
            <LatestRail articles={latest} />
          </section>
        ) : articles.length === 0 ? (
          <EmptyDesk />
        ) : (
          <LoadingSkeleton />
        )}

        <section className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-normal">
                Publication Shelves
              </h2>
              <p className="text-sm text-muted-foreground">
                Every source keeps its own rhythm, so shelves stay separate.
              </p>
            </div>
            <Badge variant="outline">{filteredArticles.length} visible</Badge>
          </div>
          <div className="flex flex-col gap-6">
            {sources.map((sourceResult) => (
              <SourceShelf
                key={sourceResult.source.id}
                source={sourceResult}
                articles={filteredArticles.filter(
                  (article) => article.sourceId === sourceResult.source.id,
                )}
              />
            ))}
          </div>
        </section>

        {remaining.length > 0 ? (
          <section className="flex flex-col gap-5">
            <h2 className="text-2xl font-semibold tracking-normal">More Latest</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {remaining.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export function LeadStory({ article }: { article: MagazineArticle }) {
  return (
    <Card className="overflow-hidden rounded-lg border bg-card shadow-sm">
      {article.imageUrl ? (
        <div className="aspect-[16/9] overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="size-full object-cover"
            src={article.imageUrl}
            alt=""
          />
        </div>
      ) : null}
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{article.source}</Badge>
          <Badge variant="outline">{article.category}</Badge>
        </div>
        <CardTitle className="text-3xl leading-tight tracking-normal sm:text-5xl">
          <a href={article.url} target="_blank" rel="noreferrer">
            {article.title}
          </a>
        </CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7">
          {article.excerpt || "Open the story for the full article."}
        </CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3">
        <ArticleMeta article={article} />
        <a
          className={buttonVariants()}
          href={article.url}
          target="_blank"
          rel="noreferrer"
        >
          Read story
          <ExternalLinkIcon data-icon="inline-end" />
        </a>
      </CardFooter>
    </Card>
  );
}

export function ArticleCard({ article }: { article: MagazineArticle }) {
  return (
    <Card className="overflow-hidden rounded-lg">
      {article.imageUrl ? (
        <div className="aspect-[5/3] overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="size-full object-cover"
            src={article.imageUrl}
            alt=""
          />
        </div>
      ) : null}
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{article.source}</Badge>
          <Badge variant="outline">{article.category}</Badge>
        </div>
        <CardTitle className="line-clamp-3 text-xl tracking-normal">
          <a href={article.url} target="_blank" rel="noreferrer">
            {article.title}
          </a>
        </CardTitle>
        <CardDescription className="line-clamp-3">
          {article.excerpt || "Open the story for details."}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <ArticleMeta article={article} />
      </CardFooter>
    </Card>
  );
}

export function SourceShelf({
  source,
  articles,
}: {
  source: FeedSourceResult;
  articles: MagazineArticle[];
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="size-3 rounded-full"
            style={{ background: source.source.accent }}
          />
          <h3 className="text-lg font-semibold">{source.source.name}</h3>
          <Badge variant="outline">{articles.length}</Badge>
        </div>
        <a
          className={buttonVariants({ variant: "ghost", size: "sm" })}
          href={source.source.url}
          target="_blank"
          rel="noreferrer"
        >
          Visit
          <ExternalLinkIcon data-icon="inline-end" />
        </a>
      </div>
      <ScrollArea>
        <div className="flex gap-4 pb-4">
          {articles.slice(0, 8).map((article) => (
            <div key={article.id} className="w-[280px] shrink-0">
              <ArticleCard article={article} />
            </div>
          ))}
          {articles.length === 0 ? (
            <Card className="w-[280px] shrink-0 rounded-lg">
              <CardHeader>
                <CardTitle className="text-base">No stories loaded</CardTitle>
                <CardDescription>
                  This source did not return public feed items during the latest
                  refresh.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}

export function FilterBar({
  sourceId,
  setSourceId,
  category,
  setCategory,
  sources,
  categories,
}: {
  sourceId: string;
  setSourceId: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  sources: FeedSourceResult[];
  categories: string[];
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-background/75 p-3">
      <ScrollArea>
        <div className="flex gap-1" role="group" aria-label="Filter by publication">
          <Button type="button" size="sm" variant={sourceId === "all" ? "default" : "ghost"} onClick={() => setSourceId("all")}>
            All
          </Button>
          {sources.map(({ source }) => (
            <Button key={source.id} type="button" size="sm" variant={sourceId === source.id ? "default" : "ghost"} onClick={() => setSourceId(source.id)}>
              {source.name}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <Separator />
      <ScrollArea>
        <div className="flex gap-1" role="group" aria-label="Filter by section">
          <Button type="button" size="sm" variant={category === "all" ? "default" : "ghost"} onClick={() => setCategory("all")}>
            Every section
          </Button>
          {categories.map((item) => (
            <Button key={item} type="button" size="sm" variant={category === item ? "default" : "ghost"} onClick={() => setCategory(item)}>
              {item}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export function RefreshStatus({
  fetchedAt,
  articleCount,
}: {
  fetchedAt: string;
  articleCount: number;
}) {
  return (
    <Card className="rounded-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCwIcon data-icon="inline-start" />
          Refresh status
        </CardTitle>
        <CardDescription>
          Updated {formatDate(fetchedAt)} with {articleCount} stories.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        Scheduled for 6 AM, noon, and 5 PM New York time.
      </CardContent>
    </Card>
  );
}

export function FeedErrorNotice({
  sources,
}: {
  sources: FeedSourceResult[];
}) {
  return (
    <Alert>
      <AlertCircleIcon />
      <AlertTitle>Some sources used fallback loading</AlertTitle>
      <AlertDescription>
        {sources
          .map((source) => `${source.source.name}: ${source.error}`)
          .join(" ")}
      </AlertDescription>
    </Alert>
  );
}


export function EmptyDesk() {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>No public stories loaded yet</CardTitle>
        <CardDescription>
          The latest refresh could not reach the public feeds from this environment. The production site will keep trying on the scheduled refresh cadence.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
export function LoadingSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <Skeleton className="h-[520px] rounded-lg" />
      <Skeleton className="h-[520px] rounded-lg" />
    </div>
  );
}

function LatestRail({ articles }: { articles: MagazineArticle[] }) {
  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Latest Rail</CardTitle>
        <CardDescription>Fast scan across the newest arrivals.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {articles.map((article) => (
          <div key={article.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{article.source}</Badge>
              <span className="text-xs text-muted-foreground">
                {formatDate(article.publishedAt)}
              </span>
            </div>
            <a
              className="font-medium leading-snug hover:underline"
              href={article.url}
              target="_blank"
              rel="noreferrer"
            >
              {article.title}
            </a>
            <Separator />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ArticleMeta({ article }: { article: MagazineArticle }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>{article.author}</span>
      <span aria-hidden="true">/</span>
      <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
















