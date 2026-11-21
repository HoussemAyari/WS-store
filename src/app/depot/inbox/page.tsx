"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Submission = {
  id: string;
  type: string;
  description: string;
  customer_name: string | null;
  status: "nouveau" | "en_cours" | "traite";
  created_at: string;
  shopName: string;
};
type ThreadMessage = { id: string; sender_role: "shop" | "depot"; body: string; created_at: string };
type Thread = { id: string; subject: string | null; unread_depot: boolean; updated_at: string; shopName: string; messages: ThreadMessage[] };
const types: Record<string, string> = { note: "Note", recommandation: "Recommandation", produit_client: "Produit pour un client", produit_stock: "Produit pour le stock" };
const statuts: Record<Submission["status"], string> = { nouveau: "Nouveau", en_cours: "En cours", traite: "Traité" };

export default function InboxPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selected, setSelected] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const selectedThread = threads.find((thread) => thread.id === selected);

  const charger = useCallback(async () => {
    const response = await fetch("/api/depot/inbox", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erreur || "Impossible de charger la boîte de réception.");
    setSubmissions(data.submissions);
    setThreads(data.threads);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/depot/inbox", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erreur || "Impossible de charger la boîte de réception.");
        if (active) { setSubmissions(data.submissions); setThreads(data.threads); }
      })
      .catch((error: unknown) => { if (active) setErreur(error instanceof Error ? error.message : "Impossible de charger la boîte de réception."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function changerStatut(submission: Submission) {
    const status = submission.status === "nouveau" ? "en_cours" : "traite";
    setBusy(submission.id);
    setErreur("");
    setMessage("");
    try {
      const response = await fetch("/api/depot/inbox", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: submission.id, status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "Le statut n’a pas pu être mis à jour.");
      setMessage("Statut de l’envoi mis à jour.");
      await charger();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Le statut n’a pas pu être mis à jour.");
    } finally { setBusy(""); }
  }

  async function ouvrirConversation(thread: Thread) {
    setSelected(thread.id);
    if (!thread.unread_depot) return;
    try {
      const response = await fetch("/api/depot/inbox", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: thread.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "La conversation n’a pas pu être marquée comme lue.");
      setThreads((current) => current.map((item) => item.id === thread.id ? { ...item, unread_depot: false } : item));
    } catch (error) { setErreur(error instanceof Error ? error.message : "La conversation n’a pas pu être marquée comme lue."); }
  }

  async function envoyerReponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThread || !reply.trim()) return;
    setBusy(selectedThread.id);
    setErreur("");
    setMessage("");
    try {
      const response = await fetch("/api/depot/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId: selectedThread.id, body: reply.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "Le message n’a pas pu être envoyé.");
      setReply("");
      setMessage("Réponse envoyée à la boutique.");
      await charger();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Le message n’a pas pu être envoyé.");
    } finally { setBusy(""); }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 sm:p-8">
      <Link href="/depot" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <h1 className="mt-5 text-3xl font-bold">Boîte de réception</h1>
      {erreur && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 font-semibold text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</p>}
      {loading ? <p className="mt-6 rounded-2xl bg-white p-6">Chargement des messages et envois…</p> : <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
        <section><h2 className="mb-3 text-xl font-bold">Envois des boutiques</h2>{submissions.length === 0 ? <p className="rounded-2xl bg-white p-5 text-gray-600">Aucun envoi reçu.</p> : <div className="space-y-3">{submissions.map((entry) => <article key={entry.id} className="rounded-[24px] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-[#8b7134]">{types[entry.type] ?? entry.type} · {entry.shopName}</p><p className="mt-1 text-sm text-gray-500">{new Date(entry.created_at).toLocaleString("fr-FR")}</p></div><span className="rounded-full bg-[#efeadf] px-3 py-2 font-semibold">{statuts[entry.status]}</span></div>
          {entry.customer_name && <p className="mt-3 font-semibold">Client : {entry.customer_name}</p>}<p className="mt-3 whitespace-pre-wrap">{entry.description}</p>
          {entry.status !== "traite" && <button disabled={busy === entry.id} onClick={() => void changerStatut(entry)} className="touch-target mt-4 w-full rounded-xl bg-[#111111] font-bold text-white disabled:opacity-50">{busy === entry.id ? "Mise à jour…" : entry.status === "nouveau" ? "Prendre en charge" : "Marquer comme traité"}</button>}
        </article>)}</div>}</section>
        <section><h2 className="mb-3 text-xl font-bold">Conversations</h2>{threads.length === 0 ? <p className="rounded-2xl bg-white p-5 text-gray-600">Aucun message reçu.</p> : <div className="space-y-3">{threads.map((thread) => {
          const last = [...thread.messages].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
          return <button key={thread.id} onClick={() => void ouvrirConversation(thread)} className={`touch-target h-auto min-h-20 w-full rounded-2xl border-2 bg-white p-4 text-left ${selected === thread.id ? "border-[#111111]" : "border-transparent"}`}>
            <span className="flex items-center justify-between gap-2 font-bold">{thread.shopName}{thread.unread_depot && <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-800">Nouveau</span>}</span><span className="mt-1 block text-sm text-gray-600">{last?.body ?? thread.subject ?? "Nouvelle conversation"}</span>
          </button>;
        })}</div>}
          {selectedThread && <div className="mt-4 rounded-[24px] bg-white p-5 shadow-sm"><h3 className="font-bold">{selectedThread.shopName} · {selectedThread.subject ?? "Conversation"}</h3><div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{selectedThread.messages.length === 0 ? <p className="text-gray-500">Aucun message dans cette conversation.</p> : [...selectedThread.messages].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((item) => <div key={item.id} className={`max-w-[90%] rounded-2xl p-3 ${item.sender_role === "depot" ? "ml-auto bg-[#111111] text-white" : "bg-[#f7f6f2]"}`}><p>{item.body}</p><time className="mt-1 block text-xs opacity-70">{new Date(item.created_at).toLocaleString("fr-FR")}</time></div>)}</div><form onSubmit={envoyerReponse} className="mt-4 flex gap-2"><input value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} className="touch-target min-w-0 flex-1 rounded-xl border-2 px-3" placeholder="Écrire une réponse" /><button disabled={!reply.trim() || busy === selectedThread.id} className="touch-target rounded-xl bg-[#111111] px-4 font-bold text-white disabled:opacity-50">Envoyer</button></form></div>}
        </section>
      </div>}
    </main>
  );
}
