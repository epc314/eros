"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NarratorIdentity } from "@/components/narrator/NarratorIdentity";
import { useNarrator } from "@/components/narrator/NarratorProvider";
import type { PublicNarrator } from "@/lib/narrator/types";

type SortMode = "latest" | "likes";
interface ProposalSummary {
  id: string;
  title: string;
  author: PublicNarrator;
  isPinned: boolean;
  pinnedAt: string | null;
  createdAt: string;
  replyCount: number;
  likeCount: number;
  viewerLiked: boolean;
}
interface ProposalDetail extends ProposalSummary { content: string }
interface ProposalReply { id: string; postId: string; body: string; createdAt: string; author: PublicNarrator }
interface ProposalPage { pinned: ProposalSummary[]; posts: ProposalSummary[]; nextCursor: string | null; hasMore: boolean }

function countCharacters(value: string): number { return Array.from(value).length; }

function LikeButton({ post, onLike, busy }: { post: ProposalSummary; onLike: (id: string) => void; busy: boolean }) {
  return <button type="button" disabled={busy} onClick={(event) => { event.stopPropagation(); onLike(post.id); }} aria-label={post.viewerLiked ? "取消点赞" : "点赞"}
    className={`inline-flex min-h-8 items-center gap-1 rounded-full border px-2 text-[11px] transition ${post.viewerLiked ? "border-rose-300/35 bg-rose-300/10 text-rose-200" : "border-white/10 text-slate-500 hover:border-rose-300/25 hover:text-rose-200"} disabled:opacity-40`}>
    <span aria-hidden="true">{post.viewerLiked ? "♥" : "♡"}</span><span>{post.likeCount}</span>
  </button>;
}

function ProposalRow({ post, onOpen, onLike, liking }: { post: ProposalSummary; onOpen: (id: string) => void; onLike: (id: string) => void; liking: boolean }) {
  return <article className="group rounded-2xl border border-white/10 bg-black/20 p-3 text-left transition hover:border-violet-200/20 hover:bg-white/[.045]">
    <button type="button" onClick={() => onOpen(post.id)} className="block w-full text-left"><h3 className="line-clamp-2 font-serif text-[15px] font-semibold leading-6 text-slate-100 group-hover:text-violet-100">{post.title}</h3></button>
    <div className="mt-2 flex items-end justify-between gap-3">
      <NarratorIdentity narrator={post.author} className="min-w-0 text-[11px]" />
      <div className="flex shrink-0 items-center gap-1.5"><span className="text-[10px] text-slate-600">{post.replyCount} 回复</span><LikeButton post={post} onLike={onLike} busy={liking} /></div>
    </div>
  </article>;
}

export function ProposalStone() {
  const { narrator, openAuthentication } = useNarrator();
  const [open, setOpen] = useState(false);
  const [hiddenByOtherWindow, setHiddenByOtherWindow] = useState(false);
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [sort, setSort] = useState<SortMode>("latest");
  const [pinned, setPinned] = useState<ProposalSummary[]>([]);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const [posts, setPosts] = useState<ProposalSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [detail, setDetail] = useState<ProposalDetail | null>(null);
  const [replies, setReplies] = useState<ProposalReply[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reply, setReply] = useState("");
  const [voterKey, setVoterKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likingId, setLikingId] = useState("");
  const [error, setError] = useState("");
  const listScroller = useRef<HTMLDivElement>(null);
  const messageEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let key = window.localStorage.getItem("eros-proposal-voter");
    if (!key) { key = crypto.randomUUID(); window.localStorage.setItem("eros-proposal-voter", key); }
    setVoterKey(key);
  }, []);

  useEffect(() => {
    const closeForOtherWindow = (event: Event) => {
      const otherWindowOpen = (event as CustomEvent<{ window?: string }>).detail?.window !== "proposal-stone";
      setHiddenByOtherWindow(otherWindowOpen);
      if (otherWindowOpen) setOpen(false);
    };
    const restoreAfterOtherWindowCloses = (event: Event) => {
      if ((event as CustomEvent<{ window?: string }>).detail?.window !== "proposal-stone") setHiddenByOtherWindow(false);
    };
    window.addEventListener("eros-floating-window-open", closeForOtherWindow);
    window.addEventListener("eros-floating-window-close", restoreAfterOtherWindowCloses);
    return () => {
      window.removeEventListener("eros-floating-window-open", closeForOtherWindow);
      window.removeEventListener("eros-floating-window-close", restoreAfterOtherWindowCloses);
    };
  }, []);

  const loadList = useCallback(async (mode: SortMode, preserveScroll = false) => {
    if (!voterKey) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/proposals?sort=${mode}&voterKey=${encodeURIComponent(voterKey)}`, { cache: "no-store" });
      const body = await response.json() as ProposalPage & { error?: { message?: string } };
      if (!response.ok) { setError(body.error?.message ?? "建言石暂时沉默。"); return; }
      setPinned(body.pinned); setPinnedIndex((current) => Math.min(current, Math.max(0, body.pinned.length - 1)));
      setPosts(body.posts); setCursor(body.nextCursor); setHasMore(body.hasMore);
      if (!preserveScroll) window.requestAnimationFrame(() => {
        if (!listScroller.current) return;
        listScroller.current.scrollTop = mode === "latest" ? listScroller.current.scrollHeight : 0;
      });
    } catch { setError("无法抵达建言石，请检查网络后重试。"); }
    finally { setBusy(false); }
  }, [voterKey]);

  useEffect(() => { if (open && view === "list") void loadList(sort); }, [loadList, narrator?.id, open, sort, view]);
  useEffect(() => { if (view === "detail") messageEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [replies, view]);

  async function loadMore() {
    if (!cursor || !hasMore || loadingMore || !voterKey) return;
    const scroller = listScroller.current;
    const previousHeight = scroller?.scrollHeight ?? 0;
    setLoadingMore(true);
    try {
      const response = await fetch(`/api/proposals?sort=${sort}&cursor=${encodeURIComponent(cursor)}&voterKey=${encodeURIComponent(voterKey)}`, { cache: "no-store" });
      const body = await response.json() as ProposalPage & { error?: { message?: string } };
      if (!response.ok) { setError(body.error?.message ?? "无法继续读取建言。"); return; }
      setPosts((current) => sort === "latest" ? [...body.posts, ...current] : [...current, ...body.posts]);
      setCursor(body.nextCursor); setHasMore(body.hasMore);
      if (sort === "latest") window.requestAnimationFrame(() => {
        if (scroller) scroller.scrollTop = scroller.scrollHeight - previousHeight;
      });
    } catch { setError("无法继续读取建言。"); }
    finally { setLoadingMore(false); }
  }

  async function openProposal(id: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/proposals/${encodeURIComponent(id)}?voterKey=${encodeURIComponent(voterKey)}`, { cache: "no-store" });
      const body = await response.json() as { post?: ProposalDetail; replies?: ProposalReply[]; error?: { message?: string } };
      if (!response.ok || !body.post) { setError(body.error?.message ?? "没有找到这条建言。"); return; }
      setDetail(body.post); setReplies(body.replies ?? []); setReply(""); setView("detail");
    } catch { setError("无法打开这条建言。"); }
    finally { setBusy(false); }
  }

  async function createPost(event: React.FormEvent) {
    event.preventDefault();
    if (!narrator) { openAuthentication(); return; }
    if (!title.trim() || countCharacters(title.trim()) > 30) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/proposals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, content }) });
      const body = await response.json() as { proposal?: ProposalDetail; error?: { message?: string } };
      if (!response.ok || !body.proposal) { setError(body.error?.message ?? "建言未能刻入石中。"); return; }
      setTitle(""); setContent(""); setSort("latest"); setView("list");
      await loadList("latest");
    } catch { setError("建言未能刻入石中，请稍后重试。"); }
    finally { setBusy(false); }
  }

  async function sendReply(event: React.FormEvent) {
    event.preventDefault();
    if (!narrator) { openAuthentication(); return; }
    if (!detail || !reply.trim()) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/proposals/${detail.id}/replies`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ body: reply }) });
      const body = await response.json() as { reply?: ProposalReply; error?: { message?: string } };
      if (!response.ok || !body.reply) { setError(body.error?.message ?? "回复未能送达。"); return; }
      setReplies((current) => [...current, body.reply!]);
      setDetail((current) => current ? { ...current, replyCount: current.replyCount + 1 } : current);
      setPosts((current) => current.map((post) => post.id === detail.id ? { ...post, replyCount: post.replyCount + 1 } : post));
      setReply("");
    } catch { setError("回复未能送达，请稍后重试。"); }
    finally { setBusy(false); }
  }

  async function toggleLike(id: string) {
    if (!voterKey || likingId) return;
    setLikingId(id); setError("");
    try {
      const response = await fetch(`/api/proposals/${id}/like`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ voterKey }) });
      const body = await response.json() as { likeCount?: number; viewerLiked?: boolean; error?: { message?: string } };
      if (!response.ok || typeof body.likeCount !== "number") { setError(body.error?.message ?? "点赞未能保存。"); return; }
      const update = (post: ProposalSummary) => post.id === id ? { ...post, likeCount: body.likeCount!, viewerLiked: Boolean(body.viewerLiked) } : post;
      setPinned((current) => current.map(update)); setPosts((current) => current.map(update)); setDetail((current) => current ? update(current) as ProposalDetail : current);
    } catch { setError("点赞未能保存。"); }
    finally { setLikingId(""); }
  }

  async function setPinnedState(pinnedState: boolean) {
    if (!detail || !narrator?.isAdmin) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/proposals/${detail.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ pinned: pinnedState }) });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) { setError(body.error?.message ?? "无法更改置顶状态。"); return; }
      setDetail((current) => current ? { ...current, isPinned: pinnedState } : current);
      await loadList(sort, true);
    } catch { setError("无法更改置顶状态。"); }
    finally { setBusy(false); }
  }

  async function removePost() {
    if (!detail || !narrator?.isAdmin || !window.confirm(`确认删除建言“${detail.title}”？此操作会同时删除全部回复。`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/proposals/${detail.id}`, { method: "DELETE" });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) { setError(body.error?.message ?? "无法删除建言。"); return; }
      setDetail(null); setReplies([]); setView("list"); await loadList(sort);
    } catch { setError("无法删除建言。"); }
    finally { setBusy(false); }
  }

  function closeStone() {
    setOpen(false); setView("list"); setError("");
    window.dispatchEvent(new CustomEvent("eros-floating-window-close", { detail: { window: "proposal-stone" } }));
  }

  if (!open && hiddenByOtherWindow) return null;
  if (!open) return <button type="button" onClick={() => { window.dispatchEvent(new CustomEvent("eros-floating-window-open", { detail: { window: "proposal-stone" } })); setOpen(true); }} aria-label="展开建言石"
    className="fixed right-0 top-[42%] z-[68] flex flex-col items-center rounded-l-xl border border-r-0 border-violet-200/20 bg-[#171421]/95 px-1.5 py-2 font-serif text-xs leading-4 text-violet-100 shadow-xl backdrop-blur-xl md:right-[414px]">
    <span>建</span><span>言</span><span>石</span>
  </button>;

  const activePinned = pinned[pinnedIndex];
  return <aside aria-label="建言石" className="fixed bottom-2 left-2 right-2 top-16 z-[68] min-h-0 md:bottom-auto md:left-auto md:right-[414px] md:top-[24%] md:h-[min(620px,66vh)] md:w-[370px]">
    <button type="button" onClick={closeStone} aria-label="收起建言石" className="absolute left-0 top-1/2 z-20 grid h-14 w-6 -translate-y-1/2 place-items-center rounded-r-full border border-l-0 border-violet-100/15 bg-[#171421]/95 text-base text-violet-100/60 shadow-lg backdrop-blur-xl transition hover:text-violet-50 md:-translate-x-1/2 md:rounded-full md:border-l">›</button>
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-violet-100/15 bg-[#100e18]/[.97] shadow-2xl shadow-black/70 backdrop-blur-2xl">
    {view !== "list" && <button type="button" onClick={() => { setView("list"); setError(""); void loadList(sort); }} className="absolute left-3 top-3 z-20 min-h-8 rounded-full border border-white/10 bg-[#171421]/95 px-3 text-[11px] text-slate-400 shadow-lg backdrop-blur-xl hover:text-white">返回</button>}

    {view === "list" && <>
      <div className="shrink-0 border-b border-violet-100/10 px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="grid flex-1 grid-cols-2 rounded-xl bg-black/25 p-1 text-xs"><button type="button" onClick={() => setSort("latest")} className={`min-h-9 rounded-lg ${sort === "latest" ? "bg-violet-100/10 text-violet-100" : "text-slate-500"}`}>最新</button><button type="button" onClick={() => setSort("likes")} className={`min-h-9 rounded-lg ${sort === "likes" ? "bg-violet-100/10 text-violet-100" : "text-slate-500"}`}>点赞</button></div>
          <button type="button" onClick={() => narrator ? setView("create") : openAuthentication()} className="min-h-11 rounded-xl bg-violet-100 px-3 text-xs font-semibold text-[#15101d]">刻下建言</button>
        </div>
        {!narrator && <button type="button" onClick={openAuthentication} className="mt-2 w-full text-left text-[10px] text-violet-200/55 hover:text-violet-100">登录记述者账户后即可发布建言与回复。</button>}
        {activePinned && <section className="mt-3 rounded-2xl border border-amber-200/15 bg-amber-100/[.035] p-2.5" aria-label="置顶建言">
          <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[.2em] text-amber-200/55"><span>置顶建言</span><span>{pinnedIndex + 1} / {pinned.length}</span></div>
          <div className="flex items-center gap-2"><button type="button" disabled={pinned.length < 2} onClick={() => setPinnedIndex((pinnedIndex - 1 + pinned.length) % pinned.length)} aria-label="上一条置顶建言" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-slate-500 disabled:opacity-20">‹</button><div className="min-w-0 flex-1"><ProposalRow post={activePinned} onOpen={openProposal} onLike={toggleLike} liking={likingId === activePinned.id} /></div><button type="button" disabled={pinned.length < 2} onClick={() => setPinnedIndex((pinnedIndex + 1) % pinned.length)} aria-label="下一条置顶建言" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-slate-500 disabled:opacity-20">›</button></div>
        </section>}
      </div>
      <div ref={listScroller} onScroll={(event) => { const element = event.currentTarget; if (sort === "latest" && element.scrollTop < 48) void loadMore(); else if (sort === "likes" && element.scrollHeight - element.scrollTop - element.clientHeight < 80) void loadMore(); }} className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className={`flex min-h-full flex-col gap-2 ${sort === "latest" ? "justify-end" : "justify-start"}`}>
          {sort === "latest" && hasMore && <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="py-2 text-[10px] text-violet-200/45">{loadingMore ? "正在读取旧建言……" : "向上滑动查看更多先前建言"}</button>}
          {!busy && !posts.length && <div className="grid flex-1 place-items-center py-10 text-center text-xs leading-6 text-slate-600">石面尚且空白。<br />等待第一条建言。</div>}
          {posts.map((post) => <ProposalRow key={post.id} post={post} onOpen={openProposal} onLike={toggleLike} liking={likingId === post.id} />)}
          {sort === "likes" && hasMore && <button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="py-2 text-[10px] text-violet-200/45">{loadingMore ? "正在读取更多建言……" : "向下滑动查看更多"}</button>}
        </div>
      </div>
    </>}

    {view === "create" && <form onSubmit={createPost} className="min-h-0 flex-1 overflow-y-auto p-4 pt-14">
      <p className="text-xs leading-6 text-slate-400">建言会永久留下发布者的记述者身份。标题是石面上的铭文，正文可留空。</p>
      <label className="mt-4 block text-xs text-slate-400">标题 · 必填
        <input autoFocus required maxLength={30} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="不超过 30 个字符" className="mt-1 min-h-12 w-full rounded-xl border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus:border-violet-200/30" />
        <span className={`mt-1 block text-right text-[10px] ${countCharacters(title) > 30 ? "text-red-300" : "text-slate-600"}`}>{countCharacters(title)} / 30</span>
      </label>
      <label className="mt-3 block text-xs text-slate-400">内容 · 可留空<textarea maxLength={2000} value={content} onChange={(event) => setContent(event.target.value)} placeholder="写下你的建言……" className="mt-1 h-48 w-full resize-none rounded-xl border border-white/10 bg-black/25 p-3 text-sm leading-6 text-white outline-none focus:border-violet-200/30" /></label>
      {error && <p className="mt-3 rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-xs leading-5 text-red-200">{error}</p>}
      <button disabled={busy || !title.trim() || countCharacters(title.trim()) > 30} className="mt-4 min-h-12 w-full rounded-xl bg-violet-100 px-4 text-sm font-semibold text-[#15101d] disabled:opacity-30">{busy ? "正在刻写……" : "发布建言"}</button>
    </form>}

    {view === "detail" && detail && <>
      <div className="shrink-0 border-b border-violet-100/10 px-4 pb-3 pt-14">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="font-serif text-lg font-semibold leading-7 text-violet-50">{detail.title}</h3><div className="mt-1"><NarratorIdentity narrator={detail.author} className="text-[11px]" /></div></div><LikeButton post={detail} onLike={toggleLike} busy={likingId === detail.id} /></div>
        {narrator?.isAdmin && <div className="mt-3 flex gap-2"><button type="button" disabled={busy} onClick={() => void setPinnedState(!detail.isPinned)} className="min-h-8 rounded-full border border-amber-200/20 px-3 text-[10px] text-amber-100 disabled:opacity-30">{detail.isPinned ? "取消置顶" : "置顶建言"}</button><button type="button" disabled={busy} onClick={() => void removePost()} className="min-h-8 rounded-full border border-red-300/20 px-3 text-[10px] text-red-200 disabled:opacity-30">删除建言</button></div>}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
        {detail.content && <article className="max-w-[92%]"><div className="mb-1 px-1 text-[9px] text-slate-500"><NarratorIdentity narrator={detail.author} className="text-[10px]" /></div><p className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-violet-100/10 bg-violet-100/[.045] px-3 py-2.5 text-sm leading-6 text-slate-200">{detail.content}</p></article>}
        {replies.map((item) => <article key={item.id} className="max-w-[92%]"><div className="mb-1 flex items-end justify-between gap-3 px-1 text-[9px] text-slate-600"><NarratorIdentity narrator={item.author} className="text-[10px]" /><time>{new Date(item.createdAt).toLocaleString(undefined, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div><p className="whitespace-pre-wrap rounded-2xl rounded-tl-md border border-white/10 bg-white/[.035] px-3 py-2.5 text-sm leading-6 text-slate-300">{item.body}</p></article>)}
        {!detail.content && !replies.length && <p className="py-10 text-center text-xs text-slate-600">这条建言尚无正文与回复。</p>}
        <div ref={messageEnd} />
      </div>
      {error && <p className="mx-3 mb-2 shrink-0 rounded-xl border border-red-400/15 bg-red-400/5 p-2.5 text-xs leading-5 text-red-200">{error}</p>}
      {narrator ? <form onSubmit={sendReply} className="shrink-0 border-t border-violet-100/10 bg-black/20 p-3"><textarea maxLength={1000} value={reply} onChange={(event) => setReply(event.target.value)} rows={2} placeholder="回复这条建言……" className="max-h-28 min-h-16 w-full resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm leading-5 outline-none placeholder:text-slate-600 focus:border-violet-200/30" /><button disabled={busy || !reply.trim()} className="mt-2 min-h-10 w-full rounded-xl bg-violet-100 px-4 text-xs font-semibold text-[#15101d] disabled:opacity-30">发送回复</button></form>
        : <div className="shrink-0 border-t border-violet-100/10 p-3"><button type="button" onClick={openAuthentication} className="min-h-11 w-full rounded-xl border border-violet-200/20 bg-violet-100/5 px-3 text-xs text-violet-100">登录后才可回复建言</button></div>}
    </>}
    {view === "list" && error && <p className="shrink-0 border-t border-red-400/10 bg-red-400/5 px-3 py-2 text-xs text-red-200">{error}</p>}
    </div>
  </aside>;
}
