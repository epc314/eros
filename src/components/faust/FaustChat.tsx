"use client";

import { useEffect, useRef, useState } from "react";
import { FAUST_GREETING, FAUST_QUICK_REPLY } from "@/lib/faust";

interface SearchExistence {
  id: string;
  name: string;
  genomeHex: string;
  generation: number;
  isDead: boolean;
}

interface SelectedExistence { id: string; name: string }

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  existences?: SelectedExistence[];
}

const initialMessage: ChatMessage = { id: "faust-introduction", role: "assistant", content: FAUST_GREETING };

export function FaustChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchExistence[]>([]);
  const [selected, setSelected] = useState<SelectedExistence[]>([]);
  const messageEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) messageEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy, open]);
  useEffect(() => {
    if (!pickerOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/nodes?query=${encodeURIComponent(search.trim())}`, { cache: "no-store", signal: controller.signal });
        const body = await response.json() as { nodes?: SearchExistence[] };
        if (response.ok) setResults(body.nodes ?? []);
      } catch (cause) {
        if (!(cause instanceof DOMException && cause.name === "AbortError")) setResults([]);
      } finally { if (!controller.signal.aborted) setSearching(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [pickerOpen, search]);

  function toggleExistence(existence: SearchExistence) {
    setError("");
    setSelected((current) => {
      if (current.some((item) => item.id === existence.id)) return current.filter((item) => item.id !== existence.id);
      if (current.length >= 8) { setError("每条消息最多检索 8 个存在。"); return current; }
      return [...current, { id: existence.id, name: existence.name }];
    });
  }

  async function sendMessage(rawContent: string) {
    const content = rawContent.trim();
    if (!content || busy) return;
    const attachments = selected;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content,
      ...(attachments.length ? { existences: attachments } : {}) };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages); setDraft(""); setSelected([]); setPickerOpen(false); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/faust/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: nextMessages.slice(-30).map((message) => ({
          role: message.role,
          content: message.content,
          ...(message.existences?.length ? { existenceRefs: message.existences.map((item) => item.id) } : {}),
        })) }),
      });
      const body = await response.json() as { message?: { content?: string }; error?: { message?: string } };
      if (!response.ok || !body.message?.content) setError(body.error?.message ?? "浮士德暂时没有回应。");
      else setMessages([...nextMessages, { id: crypto.randomUUID(), role: "assistant", content: body.message.content }]);
    } catch { setError("无法抵达浮士德，请检查网络后重试。"); }
    finally { setBusy(false); }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} aria-label="展开浮士德对话"
    className="fixed left-2 top-[46%] z-[70] flex min-h-12 items-center gap-2 rounded-r-full border border-l-0 border-amber-200/20 bg-[#17130f]/95 py-2 pl-2 pr-4 text-sm text-amber-100 shadow-2xl backdrop-blur-xl sm:left-0">
    <span className="grid h-8 w-8 place-items-center rounded-full border border-amber-200/30 bg-amber-100/10 font-serif text-lg">F</span>
    <span>浮士德</span>
  </button>;

  return <aside className="fixed bottom-2 left-2 right-2 top-16 z-[70] flex flex-col overflow-hidden rounded-2xl border border-amber-100/15 bg-[#100e0d]/95 shadow-2xl shadow-black/60 backdrop-blur-2xl md:bottom-3 md:left-3 md:right-auto md:top-20 md:w-[390px]" aria-label="浮士德对话窗口">
    <header className="flex shrink-0 items-center gap-3 border-b border-amber-100/10 px-4 py-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-200/25 bg-amber-100/10 font-serif text-xl text-amber-100">F</span>
      <div className="min-w-0 flex-1"><h2 className="font-serif text-lg text-amber-50">浮士德</h2><p className="text-[11px] tracking-[.12em] text-amber-100/45">EROS 史诗的讲述者</p></div>
      <button type="button" onClick={() => setOpen(false)} aria-label="收起浮士德对话" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-xl text-slate-400 hover:text-white">‹</button>
    </header>

    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4" aria-live="polite">
      {messages.map((message) => <article key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[90%] rounded-2xl px-3 py-2.5 text-sm leading-6 ${message.role === "user" ? "rounded-br-md bg-amber-100 text-[#17130f]" : "rounded-bl-md border border-amber-100/10 bg-white/[.045] text-slate-200"}`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
          {!!message.existences?.length && <div className="mt-2 flex flex-wrap gap-1 border-t border-black/10 pt-2 text-[10px] text-[#5b4934]">{message.existences.map((item) => <span key={item.id}>检索 · {item.name}</span>)}</div>}
        </div>
      </article>)}
      {messages.length === 1 && <button type="button" onClick={() => void sendMessage(FAUST_QUICK_REPLY)} className="ml-1 rounded-full border border-amber-200/25 bg-amber-100/5 px-3 py-2 text-left text-xs text-amber-100 hover:bg-amber-100/10">{FAUST_QUICK_REPLY}</button>}
      {busy && <div className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-amber-100/10 bg-white/[.045] px-3 py-2 text-xs text-amber-100/50">浮士德正在翻阅谱系……</div></div>}
      <div ref={messageEnd} />
    </div>

    <div className="shrink-0 border-t border-amber-100/10 bg-black/20 p-3">
      {pickerOpen && <section className="mb-3 overflow-hidden rounded-xl border border-amber-100/15 bg-[#17130f]">
        <div className="border-b border-white/10 p-2"><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} aria-label="搜索需要检索的存在" placeholder="名称或 Hash 前缀" className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-amber-200/30" /></div>
        <div className="max-h-56 overflow-y-auto p-1.5">
          {searching && <p className="p-3 text-center text-xs text-slate-500">正在寻找存在…</p>}
          {!searching && !results.length && <p className="p-3 text-center text-xs text-slate-500">没有匹配的存在</p>}
          {!searching && results.map((existence) => {
            const checked = selected.some((item) => item.id === existence.id);
            return <button type="button" key={existence.id} onClick={() => toggleExistence(existence)} className={`flex w-full items-center gap-3 rounded-lg p-2 text-left ${checked ? "bg-amber-100/10" : "hover:bg-white/5"}`}>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs ${checked ? "border-amber-200/50 bg-amber-100 text-black" : "border-white/20"}`}>{checked ? "✓" : ""}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm text-slate-200">{existence.name}</span><span className="hash block truncate text-[10px] text-slate-600">{existence.genomeHex.slice(0, 12)}… · G{existence.generation}{existence.isDead ? " · 死亡" : ""}</span></span>
            </button>;
          })}
        </div>
      </section>}

      {!!selected.length && <div className="mb-2 flex flex-wrap gap-1.5" aria-label="已选择检索的存在">{selected.map((existence) => <span key={existence.id} className="inline-flex items-center gap-1 rounded-full border border-amber-200/20 bg-amber-100/10 py-1 pl-2.5 pr-1 text-[11px] text-amber-100">{existence.name}<button type="button" onClick={() => setSelected((items) => items.filter((item) => item.id !== existence.id))} aria-label={`取消检索 ${existence.name}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-white/10">×</button></span>)}</div>}
      {error && <p className="mb-2 rounded-lg border border-red-400/15 bg-red-400/5 px-2.5 py-2 text-xs leading-5 text-red-200">{error}</p>}
      <form onSubmit={(event) => { event.preventDefault(); void sendMessage(draft); }} className="flex items-end gap-2">
        <button type="button" onClick={() => setPickerOpen((value) => !value)} aria-label="检索图谱中的存在" aria-expanded={pickerOpen} className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${pickerOpen || selected.length ? "border-amber-200/35 bg-amber-100/10 text-amber-100" : "border-white/10 text-slate-400"}`}>
          <span aria-hidden="true" className="relative block h-4 w-4 rounded-full border-2 border-current after:absolute after:-bottom-1 after:-right-1 after:h-1.5 after:w-0.5 after:-rotate-45 after:rounded-full after:bg-current" />
        </button>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(draft); } }} maxLength={3000} rows={1} placeholder="对浮士德说些什么…" aria-label="发送给浮士德的消息" className="max-h-28 min-h-11 min-w-0 flex-1 resize-none rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm leading-5 outline-none placeholder:text-slate-600 focus:border-amber-200/30" />
        <button disabled={busy || !draft.trim()} className="min-h-11 shrink-0 rounded-xl bg-amber-100 px-3.5 text-sm font-semibold text-[#17130f] disabled:opacity-30">发送</button>
      </form>
    </div>
  </aside>;
}
