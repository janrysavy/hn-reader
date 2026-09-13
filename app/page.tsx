"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Moon, RotateCw, Sun, X } from "lucide-react";

type Feed = "top" | "new" | "ask";
type Story = { objectID: string; title: string; url?: string; author: string; points: number; num_comments: number; created_at_i: number };
type HnItem = { id: number; title?: string; url?: string; by?: string; score?: number; descendants?: number; time?: number; deleted?: boolean; dead?: boolean };
type Comment = { id: number; author?: string; text?: string; created_at_i: number; children?: Comment[] };
type FlatComment = Comment & { depth: number; ancestors: number[]; descendantCount: number };
type Thread = { id: number; title: string; url?: string; author: string; points: number; created_at_i: number; children: Comment[] };

const API = "https://hn.algolia.com/api/v1";
const HN_API = "https://hacker-news.firebaseio.com/v0";
const feedEndpoints: Record<Feed, string> = {
  top: "topstories",
  new: "newstories",
  ask: "askstories",
};
const hnFeedUrls: Record<Feed, string> = {
  top: "https://news.ycombinator.com/news",
  new: "https://news.ycombinator.com/newest",
  ask: "https://news.ycombinator.com/ask",
};

function age(timestamp: number) {
  const seconds = Math.max(1, Date.now() / 1000 - timestamp);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function domain(url?: string) {
  if (!url) return "news.ycombinator.com";
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "link"; }
}

function safeHtml(input = "") {
  if (typeof window === "undefined") return "";
  const doc = new DOMParser().parseFromString(input, "text/html");
  const allowed = new Set(["P", "A", "I", "EM", "B", "STRONG", "PRE", "CODE", "BR", "BLOCKQUOTE"]);
  [...doc.body.querySelectorAll("*")].forEach((el) => {
    if (!allowed.has(el.tagName)) { el.replaceWith(...Array.from(el.childNodes)); return; }
    const href = el.tagName === "A" ? el.getAttribute("href") : null;
    [...el.attributes].forEach((a) => el.removeAttribute(a.name));
    if (href && /^https?:\/\//i.test(href)) {
      el.setAttribute("href", href);
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
  return doc.body.innerHTML;
}

function ThemeButton() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const saved = localStorage.getItem("hn-theme");
    const next = saved === "dark" || (!saved && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    setTheme(next); document.documentElement.dataset.theme = next;
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); document.documentElement.dataset.theme = next; localStorage.setItem("hn-theme", next);
  };
  return <button className="icon-button" onClick={toggle} aria-label={`Use ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? <Sun /> : <Moon />}</button>;
}

function FontSizeControl() {
  const [size, setSize] = useState(17);
  useEffect(() => {
    const stored = Number(localStorage.getItem("hn-font-size"));
    const initial = Number.isFinite(stored) && stored >= 15 && stored <= 26 ? stored : 17;
    setSize(initial);
    document.documentElement.style.setProperty("--reader-font-size", `${initial}px`);
  }, []);
  const changeSize = (value: number) => {
    setSize(value);
    document.documentElement.style.setProperty("--reader-font-size", `${value}px`);
    localStorage.setItem("hn-font-size", String(value));
  };
  const nudgeSize = (delta: number) => {
    const next = Math.min(26, Math.max(15, Math.round((size + delta) * 4) / 4));
    changeSize(next);
  };
  return (
    <div className="font-control" role="group" aria-label="Reading text size" title={`Reading text: ${size.toFixed(2)} px`}>
      <button className="text-size-button small-a" type="button" onClick={() => nudgeSize(-0.25)} disabled={size <= 15} aria-label="Decrease reading text size">A</button>
      <input type="range" min="15" max="26" step="0.25" value={size} onChange={(event) => changeSize(Number(event.target.value))} aria-label="Reading text size" />
      <button className="text-size-button large-a" type="button" onClick={() => nudgeSize(0.25)} disabled={size >= 26} aria-label="Increase reading text size">A</button>
    </div>
  );
}

function flattenComments(comments: Comment[] = [], depth = 0, ancestors: number[] = []): FlatComment[] {
  return comments.flatMap((comment) => {
    const descendants = flattenComments(comment.children, depth + 1, [...ancestors, comment.id]);
    return [{ ...comment, depth, ancestors, descendantCount: descendants.length }, ...descendants];
  });
}

function CommentRow({ comment, open, onToggle }: { comment: FlatComment; open: boolean; onToggle: () => void }) {
  if (!comment.author && !comment.text) return null;
  return (
    <article className="comment" data-depth={Math.min(comment.depth, 5)}>
      <button className="comment-head" onClick={onToggle} aria-expanded={open}>
        <span className="chevron">{open ? <ChevronDown /> : <ChevronRight />}</span>
        <strong>{comment.author || "deleted"}</strong>
        <span>· {age(comment.created_at_i)}</span>
        {comment.depth > 0 && <span className="depth-label">level {comment.depth + 1}</span>}
        {!open && <span className="collapsed">{comment.descendantCount ? `${comment.descendantCount} nested ${comment.descendantCount === 1 ? "reply" : "replies"}` : "collapsed"}</span>}
      </button>
      {open && <div className="comment-body" dangerouslySetInnerHTML={{ __html: safeHtml(comment.text) }} />}
    </article>
  );
}

function StoryRow({ story, rank, onOpen }: { story: Story; rank: number; onOpen: () => void }) {
  return (
    <article className="story-row">
      <span className="rank">{rank}</span>
      <div className="story-copy">
        <div className="title-line">
          <a href={story.url || `https://news.ycombinator.com/item?id=${story.objectID}`} target="_blank" rel="noreferrer">{story.title}</a>
          <span className="domain">{domain(story.url)}</span>
        </div>
        <div className="meta">
          <span className="score">{story.points ?? 0} points</span><span>by {story.author}</span><span>{age(story.created_at_i)}</span>
          <a className="hn-link" href={`https://news.ycombinator.com/item?id=${story.objectID}`} target="_top">HN discussion <ExternalLink /></a>
        </div>
      </div>
      <button className="comments-button" onClick={onOpen} aria-label={`Read ${story.num_comments ?? 0} comments on ${story.title}`}>
        <strong>{story.num_comments ?? 0}</strong><span>{story.num_comments === 1 ? "comment" : "comments"}</span>
      </button>
    </article>
  );
}

export default function Home() {
  const [feed, setFeed] = useState<Feed>("top");
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [thread, setThread] = useState<Thread | null>(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set());
  const loadSequence = useRef(0);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const loadFeed = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true); setError("");
    try {
      const response = await fetch(`${HN_API}/${feedEndpoints[feed]}.json`);
      if (!response.ok) throw new Error("feed unavailable");
      const ids: number[] = await response.json();
      const items = await Promise.all(ids.slice(0, 30).map(async (id) => {
        try {
          const itemResponse = await fetch(`${HN_API}/item/${id}.json`);
          if (!itemResponse.ok) return null;
          return await itemResponse.json() as HnItem;
        } catch { return null; }
      }));
      const orderedStories = items
        .filter((item): item is HnItem => Boolean(item?.title && !item.deleted && !item.dead))
        .map((item) => ({
          objectID: String(item.id),
          title: item.title!,
          url: item.url,
          author: item.by ?? "unknown",
          points: item.score ?? 0,
          num_comments: item.descendants ?? 0,
          created_at_i: item.time ?? 0,
        }));
      if (sequence === loadSequence.current) setStories(orderedStories);
    } catch {
      if (sequence === loadSequence.current) setError("Hacker News could not be reached. Check your connection and try again.");
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [feed]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const openThread = useCallback(async (id: string) => {
    setThreadLoading(true); setError(""); window.location.hash = id;
    try {
      const response = await fetch(`${API}/items/${id}`);
      if (!response.ok) throw new Error("thread unavailable");
      const data = await response.json();
      if (location.hash === `#${id}`) {
        setThread(data);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch { setError("That discussion could not be loaded. Please try again."); }
    finally { setThreadLoading(false); }
  }, []);
  const closeThread = () => { setThread(null); history.replaceState(null, "", location.pathname); };
  useEffect(() => { const id = location.hash.slice(1); if (/^\d+$/.test(id)) openThread(id); }, [openThread]);
  useEffect(() => {
    const followHistory = () => {
      const id = location.hash.slice(1);
      if (/^\d+$/.test(id)) openThread(id);
      else setThread(null);
    };
    window.addEventListener("popstate", followHistory);
    window.addEventListener("hashchange", followHistory);
    return () => {
      window.removeEventListener("popstate", followHistory);
      window.removeEventListener("hashchange", followHistory);
    };
  }, [openThread]);

  const feedLabel = useMemo(() => ({ top: "Top stories", new: "Newest", ask: "Ask HN" })[feed], [feed]);
  const flatComments = useMemo(() => flattenComments(thread?.children), [thread]);
  const visibleComments = useMemo(
    () => flatComments.filter((comment) => !comment.ancestors.some((id) => collapsed.has(id))),
    [flatComments, collapsed],
  );
  useEffect(() => setCollapsed(new Set()), [thread?.id]);
  const toggleComment = (id: number) => setCollapsed((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={closeThread} aria-label="HN Reader home"><span>Y</span><b>HN Reader</b></button>
        <nav aria-label="Story feeds">
          {(["top", "new", "ask"] as Feed[]).map((key) => <button key={key} className={feed === key && !thread ? "active" : ""} onClick={() => { setFeed(key); closeThread(); }}>{key === "top" ? "Top" : key === "new" ? "New" : "Ask"}</button>)}
        </nav>
        <div className="reader-controls"><FontSizeControl /><ThemeButton /></div>
      </header>

      <section className="content">
        {thread ? (
          <div className="thread-view">
            <button className="back-button" onClick={closeThread}><X /> Close discussion</button>
            <article className="story-hero">
              <p className="eyebrow">{domain(thread.url)} · {thread.points} points · {age(thread.created_at_i)}</p>
              <h1>{thread.title}</h1>
              <div className="hero-actions"><span>by {thread.author}</span><div className="hero-links"><a href={`https://news.ycombinator.com/item?id=${thread.id}`} target="_top">View on HN <ExternalLink /></a>{thread.url && <a href={thread.url} target="_blank" rel="noreferrer">Read article <ExternalLink /></a>}</div></div>
            </article>
            <div className="discussion-head"><h2>{thread.children?.length ?? 0} top-level comments</h2><p>Tap any author row to fold that entire branch.</p></div>
            <section className="comments" aria-label="Comments">
              {visibleComments.map((comment) => <CommentRow key={comment.id} comment={comment} open={!collapsed.has(comment.id)} onToggle={() => toggleComment(comment.id)} />)}
            </section>
          </div>
        ) : (
          <div className="feed-view">
            <div className="feed-head">
              <div><p className="eyebrow">Live from Hacker News</p><h1>{feedLabel}</h1></div>
              <div className="feed-actions">
                <a className="source-link" href={hnFeedUrls[feed]} target="_top" aria-label={`Open the original ${feedLabel} feed on Hacker News`}><span className="source-label-long">Original HN feed</span><span className="source-label-short">HN</span> <ExternalLink /></a>
                <button className="refresh" onClick={loadFeed} disabled={loading} aria-label="Refresh stories" title="Refresh stories"><RotateCw className={loading ? "spin" : ""} /></button>
              </div>
            </div>
            {error && <div className="error" role="alert">{error} <button onClick={loadFeed}>Try again</button></div>}
            {loading ? <div className="loading-list" aria-label="Loading stories">{Array.from({length: 8}).map((_, i) => <div className="skeleton" key={i} />)}</div> : <div className="story-list">{stories.map((story, i) => <StoryRow key={story.objectID} story={story} rank={i + 1} onOpen={() => openThread(story.objectID)} />)}</div>}
          </div>
        )}
        {threadLoading && <div className="loading-overlay" role="status"><RotateCw className="spin" /> Loading discussion…</div>}
        {thread && error && <div className="error floating" role="alert">{error}</div>}
      </section>
      <footer>Unofficial reader · Feed order from the official Hacker News API</footer>
    </main>
  );
}
