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
type Shop = { id: string; name: string };

const types: Record<string, string> = {
  note: "Note",
  recommandation: "Recommandation",
  produit_client: "Produit pour un client",
  produit_stock: "Produit pour le stock",
};
const statuts: Record<Submission["status"], string> = { nouveau: "Nouveau", en_cours: "En cours", traite: "Traité" };

export default function InboxPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [selected, setSelected] = useState("");
  const [reply, setReply] = useState("");
  const [recipientShop, setRecipientShop] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"conversations" | "submissions">("conversations");
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const selectedThread = threads.find((thread) => thread.id === selected);
  const unreadCount = threads.filter((thread) => thread.unread_depot).length;
  const pendingCount = submissions.filter((entry) => entry.status !== "traite").length;

  const charger = useCallback(async () => {
    const response = await fetch("/api/depot/inbox", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erreur || "Impossible de charger la boîte de réception.");
    setSubmissions(data.submissions);
    setThreads(data.threads);
    setShops(data.shops);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/depot/inbox", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erreur || "Impossible de charger la boîte de réception.");
        if (active) {
          setSubmissions(data.submissions);
          setThreads(data.threads);
          setShops(data.shops);
        }
      })
      .catch((error: unknown) => {
        if (active) setErreur(error instanceof Error ? error.message : "Impossible de charger la boîte de réception.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  async function changerStatut(submission: Submission) {
    const status = submission.status === "nouveau" ? "en_cours" : "traite";
    setBusy(submission.id);
    setErreur("");
    setMessage("");
    try {
      const response = await fetch("/api/depot/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: submission.id, status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "Le statut n’a pas pu être mis à jour.");
      setMessage("Statut de l’envoi mis à jour.");
      await charger();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Le statut n’a pas pu être mis à jour.");
    } finally {
      setBusy("");
    }
  }

  async function ouvrirConversation(thread: Thread) {
    setComposing(false);
    setSelected(thread.id);
    setReply("");
    if (!thread.unread_depot) return;
    try {
      const response = await fetch("/api/depot/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: thread.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "La conversation n’a pas pu être marquée comme lue.");
      setThreads((current) => current.map((item) => item.id === thread.id ? { ...item, unread_depot: false } : item));
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "La conversation n’a pas pu être marquée comme lue.");
    }
  }

  async function envoyerReponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedThread || !reply.trim()) return;
    setBusy(selectedThread.id);
    setErreur("");
    setMessage("");
    try {
      const response = await fetch("/api/depot/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId: selectedThread.id, body: reply.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "Le message n’a pas pu être envoyé.");
      setReply("");
      setMessage("Réponse envoyée à la boutique.");
      await charger();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Le message n’a pas pu être envoyé.");
    } finally {
      setBusy("");
    }
  }

  async function envoyerNouveauMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recipientShop || !newMessage.trim()) return;
    setBusy("nouveau-message");
    setErreur("");
    setMessage("");
    try {
      const response = await fetch("/api/depot/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopId: recipientShop, body: newMessage.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "Le message n’a pas pu être envoyé.");
      setSelected(data.threadId);
      setComposing(false);
      setRecipientShop("");
      setNewMessage("");
      setMessage("Message envoyé à la boutique.");
      await charger();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Le message n’a pas pu être envoyé.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      <header className="flex min-h-20 items-center justify-between border-b border-[#e7e5df] bg-white px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <Link href="/depot" aria-label="Retour au tableau de bord" className="touch-target flex items-center justify-center rounded-xl border border-[#d9d6cd] bg-white px-4 font-bold">
            ‹ <span className="ml-1 hidden sm:inline">Retour</span>
          </Link>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#8b7134]">Dépôt central</p>
            <h1 className="text-xl font-bold text-[#111111] sm:text-2xl">Boîte de réception</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] p-5 sm:p-8">
        <nav aria-label="Sections de la boîte de réception" className="grid grid-cols-2 rounded-2xl border border-[#dedbd2] bg-white p-1.5">
          <button
            type="button"
            aria-pressed={activeTab === "conversations"}
            onClick={() => setActiveTab("conversations")}
            className={`touch-target rounded-xl px-3 font-bold transition-colors ${activeTab === "conversations" ? "bg-[#111111] text-white" : "text-[#5f5b53] hover:bg-[#f7f6f2]"}`}
          >
            Conversations <span className="ml-1 text-sm opacity-75">{unreadCount > 0 ? `${unreadCount} non lu${unreadCount > 1 ? "s" : ""}` : threads.length}</span>
          </button>
          <button
            type="button"
            aria-pressed={activeTab === "submissions"}
            onClick={() => setActiveTab("submissions")}
            className={`touch-target rounded-xl px-3 font-bold transition-colors ${activeTab === "submissions" ? "bg-[#111111] text-white" : "text-[#5f5b53] hover:bg-[#f7f6f2]"}`}
          >
            Envois <span className="ml-1 text-sm opacity-75">{pendingCount}</span>
          </button>
        </nav>

        {erreur && <p role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{erreur}</p>}
        {message && <p role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</p>}

        {loading ? (
          <p className="mt-5 rounded-2xl border border-[#e7e5df] bg-white p-6 text-[#666158]">Chargement des messages et envois…</p>
        ) : activeTab === "submissions" ? (
          <section className="mt-5" aria-labelledby="submissions-heading">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#8b7134]">À traiter</p>
                <h2 id="submissions-heading" className="text-2xl font-bold">Envois des boutiques</h2>
              </div>
              <span className="rounded-xl bg-[#efeadf] px-3 py-2 text-sm font-bold">{submissions.length}</span>
            </div>
            {submissions.length === 0 ? (
              <div className="rounded-2xl border border-[#e7e5df] bg-white p-8 text-center text-[#666158]">
                <strong className="block text-lg text-[#111111]">Aucun envoi reçu</strong>
                <p className="mt-1">Les demandes des boutiques apparaîtront ici.</p>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {submissions.map((entry) => (
                  <article key={entry.id} className="rounded-2xl border border-[#e7e5df] border-l-4 border-l-[#b79a5a] bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-[#111111]">{types[entry.type] ?? entry.type}</p>
                        <p className="mt-1 text-sm font-semibold text-[#8b7134]">{entry.shopName}</p>
                      </div>
                      <span className={`rounded-full px-3 py-2 text-sm font-bold ${entry.status === "traite" ? "bg-emerald-50 text-emerald-800" : entry.status === "en_cours" ? "bg-[#efeadf] text-[#725d31]" : "bg-[#111111] text-white"}`}>
                        {statuts[entry.status]}
                      </span>
                    </div>
                    {entry.customer_name && <p className="mt-4 text-sm"><span className="font-bold">Client :</span> {entry.customer_name}</p>}
                    <p className="mt-3 whitespace-pre-wrap leading-relaxed text-[#35332f]">{entry.description}</p>
                    <time className="mt-4 block text-xs text-[#777267]">{new Date(entry.created_at).toLocaleString("fr-FR")}</time>
                    {entry.status !== "traite" && (
                      <button
                        type="button"
                        disabled={busy === entry.id}
                        onClick={() => void changerStatut(entry)}
                        className="touch-target mt-5 w-full rounded-xl bg-[#111111] px-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busy === entry.id ? "Mise à jour…" : entry.status === "nouveau" ? "Prendre en charge" : "Marquer comme traité"}
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="mt-5" aria-labelledby="conversations-heading">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#8b7134]">Échanges directs</p>
                <h2 id="conversations-heading" className="text-2xl font-bold">Conversations</h2>
              </div>
              <button
                type="button"
                onClick={() => { setComposing(true); setSelected(""); }}
                className="touch-target rounded-xl bg-[#111111] px-4 font-bold text-white"
              >
                + Nouveau message
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#e7e5df] bg-white md:grid md:grid-cols-[320px_minmax(0,1fr)]">
              <aside className={`border-[#e7e5df] bg-[#fbfaf7] md:block md:border-r ${selected || composing ? "hidden" : "block"}`}>
                {threads.length === 0 ? (
                  <div className="p-6 text-[#666158]">
                    <strong className="block text-[#111111]">Aucune conversation</strong>
                    <p className="mt-1">Envoyez le premier message à une boutique.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#ece9e1]">
                    {threads.map((thread) => {
                      const last = [...thread.messages].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
                      return (
                        <button
                          type="button"
                          key={thread.id}
                          onClick={() => void ouvrirConversation(thread)}
                          className={`touch-target h-auto w-full p-4 text-left ${selected === thread.id ? "bg-white shadow-[inset_4px_0_0_#b79a5a]" : "hover:bg-white"}`}
                        >
                          <span className="flex items-start justify-between gap-3">
                            <strong className="text-[#111111]">{thread.shopName}</strong>
                            {thread.unread_depot && <span className="shrink-0 rounded-full bg-[#111111] px-2.5 py-1 text-xs font-bold text-white">Non lu</span>}
                          </span>
                          <span className="mt-1 block truncate text-sm text-[#777267]">{last?.body ?? thread.subject ?? "Nouvelle conversation"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </aside>

              <div className={`${selected || composing ? "block" : "hidden md:flex"} min-h-[520px] flex-col`}>
                {composing ? (
                  <form onSubmit={envoyerNouveauMessage} className="m-4 rounded-2xl border border-[#dedbd2] bg-[#fbfaf7] p-5 sm:p-6">
                    <button type="button" onClick={() => setComposing(false)} className="touch-target mb-4 flex items-center text-sm font-bold text-[#8b7134] md:hidden">‹ Retour aux conversations</button>
                    <h3 className="text-xl font-bold">Nouveau message</h3>
                    <p className="mt-1 text-sm text-[#777267]">Choisissez une boutique pour commencer la conversation.</p>
                    <label className="mt-5 block">
                      <span className="mb-2 block font-bold">Boutique destinataire</span>
                      <select required value={recipientShop} onChange={(event) => setRecipientShop(event.target.value)} className="touch-target w-full rounded-xl border-2 border-[#d9d6cd] bg-white px-3">
                        <option value="" disabled>Choisir une boutique</option>
                        {shops.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                    <label className="mt-4 block">
                      <span className="mb-2 block font-bold">Message</span>
                      <textarea required value={newMessage} onChange={(event) => setNewMessage(event.target.value)} maxLength={2000} rows={5} className="w-full resize-y rounded-xl border-2 border-[#d9d6cd] bg-white p-3" placeholder="Écrire un message à cette boutique…" />
                    </label>
                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button type="button" onClick={() => setComposing(false)} className="touch-target rounded-xl border border-[#d9d6cd] px-5 font-bold">Annuler</button>
                      <button disabled={!recipientShop || !newMessage.trim() || busy === "nouveau-message"} className="touch-target rounded-xl bg-[#111111] px-5 font-bold text-white disabled:opacity-50">
                        {busy === "nouveau-message" ? "Envoi…" : "Envoyer à la boutique"}
                      </button>
                    </div>
                  </form>
                ) : selectedThread ? (
                  <>
                    <div className="flex min-h-20 items-center justify-between border-b border-[#e7e5df] px-5">
                      <div>
                        <button type="button" onClick={() => setSelected("")} className="touch-target mb-1 flex items-center text-sm font-bold text-[#8b7134] md:hidden">‹ Retour aux conversations</button>
                        <h3 className="font-bold">{selectedThread.shopName}</h3>
                        <p className="text-xs text-[#777267]">{selectedThread.subject ?? "Conversation"}</p>
                      </div>
                    </div>
                    <div className="flex-1 space-y-3 overflow-y-auto p-5">
                      {selectedThread.messages.length === 0 ? (
                        <p className="rounded-xl bg-[#f7f6f2] p-4 text-[#666158]">Aucun message dans cette conversation.</p>
                      ) : [...selectedThread.messages].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((item) => (
                        <div key={item.id} className={`max-w-[82%] rounded-2xl p-4 ${item.sender_role === "depot" ? "ml-auto rounded-br-md bg-[#111111] text-white" : "rounded-bl-md bg-[#efeadf] text-[#111111]"}`}>
                          <p className="whitespace-pre-wrap leading-relaxed">{item.body}</p>
                          <time className="mt-2 block text-xs opacity-70">{item.sender_role === "depot" ? "Dépôt" : selectedThread.shopName} · {new Date(item.created_at).toLocaleString("fr-FR")}</time>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={envoyerReponse} className="border-t border-[#e7e5df] bg-white p-4">
                      <div className="flex gap-2">
                        <input value={reply} onChange={(event) => setReply(event.target.value)} maxLength={2000} className="touch-target min-w-0 flex-1 rounded-xl border-2 border-[#d9d6cd] px-3" placeholder="Écrire une réponse" />
                        <button disabled={!reply.trim() || busy === selectedThread.id} className="touch-target rounded-xl bg-[#111111] px-4 font-bold text-white disabled:opacity-50">
                          {busy === selectedThread.id ? "Envoi…" : "Envoyer"}
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="m-auto max-w-sm p-8 text-center text-[#777267]">
                    <strong className="block text-lg text-[#111111]">Sélectionnez une conversation</strong>
                    <p className="mt-2">Les échanges avec les boutiques s’afficheront ici.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
