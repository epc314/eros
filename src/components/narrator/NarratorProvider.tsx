"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PublicNarrator } from "@/lib/narrator/types";

interface NarratorContextValue {
  narrator: PublicNarrator | null;
  loading: boolean;
  openAuthentication: () => void;
  openProfile: (narrator: PublicNarrator | string) => void;
}

const NarratorContext = createContext<NarratorContextValue | null>(null);

export function useNarrator(): NarratorContextValue {
  const value = useContext(NarratorContext);
  if (!value) throw new Error("useNarrator must be used within NarratorProvider");
  return value;
}

function Titles({ titles }: { titles: string[] }) {
  return titles.length ? <p className="mt-1 text-xs italic text-cyan-100/55">{titles.join(" | ")}</p> : null;
}

export function NarratorProvider({ children }: { children: React.ReactNode }) {
  const [narrator, setNarrator] = useState<PublicNarrator | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [profile, setProfile] = useState<PublicNarrator | null>(null);
  const [name, setName] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [messageDraft, setMessageDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/narrators/session", { cache: "no-store", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() as Promise<{ narrator: PublicNarrator | null }> : { narrator: null })
      .then(({ narrator: current }) => setNarrator(current))
      .catch(() => setNarrator(null))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const openProfile = useCallback((value: PublicNarrator | string) => {
    const initial = typeof value === "string" ? (narrator?.id === value ? narrator : null) : value;
    setProfile(initial);
    setMessageDraft(initial?.message ?? "");
    setNotice("");
    const id = typeof value === "string" ? value : value.id;
    void fetch(`/api/narrators/${encodeURIComponent(id)}`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { narrator: PublicNarrator };
      setProfile(result.narrator);
      setMessageDraft(result.narrator.message);
    });
  }, [narrator]);

  const context = useMemo<NarratorContextValue>(() => ({
    narrator,
    loading,
    openAuthentication: () => { setAuthOpen(true); setNotice(""); },
    openProfile,
  }), [loading, narrator, openProfile]);

  async function authenticate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    const endpoint = authMode === "register" ? "/api/narrators/register" : "/api/narrators/login";
    const payload = authMode === "register"
      ? { name, passphrase, passphraseConfirmation: confirmation }
      : { name, passphrase };
    try {
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json() as { narrator?: PublicNarrator; error?: { message?: string } };
      if (!response.ok || !result.narrator) { setNotice(result.error?.message ?? "无法完成身份验证。"); return; }
      setNarrator(result.narrator); setName(""); setPassphrase(""); setConfirmation(""); setAuthOpen(false);
    } catch { setNotice("无法连接到记述者账户服务，请稍后重试。"); }
    finally { setBusy(false); }
  }

  async function saveMessage(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/narrators/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: messageDraft }) });
      const result = await response.json() as { narrator?: PublicNarrator; error?: { message?: string } };
      if (!response.ok || !result.narrator) { setNotice(result.error?.message ?? "留言保存失败。"); return; }
      setNarrator(result.narrator); setProfile(result.narrator); setNotice("留言已保存。");
    } catch { setNotice("留言保存失败，请稍后重试。"); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setNotice("");
    try { await fetch("/api/narrators/logout", { method: "POST" }); }
    finally { setNarrator(null); setProfile(null); setBusy(false); }
  }

  const ownProfile = Boolean(profile && narrator?.id === profile.id);
  return <NarratorContext.Provider value={context}>
    {children}
    {authOpen && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="记述者账户" className="glass w-full max-w-md rounded-3xl p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.22em] text-cyan-300">Narrator account</p><h2 className="mt-1 font-serif text-2xl">记述者账户</h2></div><button type="button" onClick={() => setAuthOpen(false)} aria-label="关闭" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-lg text-slate-400">×</button></div>
        <div className="mt-5 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1 text-sm"><button type="button" onClick={() => { setAuthMode("login"); setNotice(""); }} className={`min-h-10 rounded-lg ${authMode === "login" ? "bg-white text-slate-950" : "text-slate-400"}`}>登录</button><button type="button" onClick={() => { setAuthMode("register"); setNotice(""); }} className={`min-h-10 rounded-lg ${authMode === "register" ? "bg-white text-slate-950" : "text-slate-400"}`}>注册</button></div>
        <form onSubmit={authenticate} className="mt-4 space-y-3">
          <label className="block text-xs text-slate-400">记述者<input required autoComplete="username" maxLength={32} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/30" /></label>
          <label className="block text-xs text-slate-400">密语<input required type="password" autoComplete={authMode === "register" ? "new-password" : "current-password"} minLength={8} maxLength={128} value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/30" /></label>
          {authMode === "register" && <label className="block text-xs text-slate-400">确认密语<input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none focus:border-cyan-300/30" /></label>}
          {notice && <p className="rounded-xl border border-red-400/15 bg-red-400/5 p-3 text-xs leading-5 text-red-200">{notice}</p>}
          <button disabled={busy} className="min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-300 to-fuchsia-300 px-4 text-sm font-semibold text-slate-950 disabled:opacity-40">{busy ? "请稍候……" : authMode === "register" ? "创建记述者" : "登录"}</button>
        </form>
      </section>
    </div>}
    {profile && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfile(null); }}>
      <section role="dialog" aria-modal="true" aria-label={`${profile.name}的记述者资料`} className="glass w-full max-w-lg rounded-3xl p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[10px] uppercase tracking-[.22em] text-cyan-300">Narrator</p><h2 className="mt-1 truncate font-serif text-3xl font-bold text-white">{profile.name}</h2><Titles titles={profile.titles} /></div><button type="button" onClick={() => setProfile(null)} aria-label="关闭" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 text-lg text-slate-400">×</button></div>
        <dl className="mt-5 space-y-3 text-sm"><div><dt className="text-xs text-slate-500">512-bit 唯一标识</dt><dd className="hash mt-1 max-h-20 overflow-y-auto break-all rounded-xl bg-black/25 p-3 text-[10px] leading-4 text-slate-400">{profile.id}</dd></div><div><dt className="text-xs text-slate-500">创建时间</dt><dd className="mt-1 text-slate-300">{new Date(profile.createdAt).toLocaleString()}</dd></div><div><dt className="text-xs text-slate-500">称号</dt><dd className="mt-1 italic text-slate-300">{profile.titles.length ? profile.titles.join(" | ") : "尚无称号"}</dd></div></dl>
        {ownProfile ? <form onSubmit={saveMessage} className="mt-5"><label className="text-xs text-slate-500">留言（仅你可以修改）<textarea maxLength={500} value={messageDraft} onChange={(event) => setMessageDraft(event.target.value)} placeholder="写下留给这个世界的话……" className="mt-2 h-28 w-full resize-none rounded-xl border border-white/10 bg-slate-950 p-3 text-sm leading-6 outline-none focus:border-cyan-300/30" /></label><div className="mt-3 flex gap-2"><button disabled={busy} className="min-h-11 flex-1 rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 disabled:opacity-40">保存留言</button><button type="button" disabled={busy} onClick={() => void logout()} className="min-h-11 rounded-xl border border-red-400/20 px-4 text-sm text-red-300 disabled:opacity-40">退出登录</button></div></form> : <div className="mt-5"><p className="text-xs text-slate-500">留言</p><p className="mt-2 min-h-16 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/15 p-3 text-sm leading-6 text-slate-300">{profile.message || "这名记述者尚未留下留言。"}</p></div>}
        {notice && <p className="mt-3 text-xs text-cyan-300">{notice}</p>}
      </section>
    </div>}
  </NarratorContext.Provider>;
}

export function NarratorAccountButton() {
  const { narrator, loading, openAuthentication, openProfile } = useNarrator();
  if (loading) return <span className="hidden text-xs text-slate-600 sm:inline">身份读取中</span>;
  if (!narrator) return <button type="button" onClick={openAuthentication} className="min-h-9 rounded-full border border-cyan-300/20 px-3 text-xs font-semibold text-cyan-200 hover:border-cyan-300/40">记述者登录</button>;
  return <button type="button" onClick={() => openProfile(narrator)} className="min-h-9 max-w-32 truncate rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 text-xs font-bold text-cyan-100 hover:border-cyan-300/40 sm:max-w-48">{narrator.name}</button>;
}
