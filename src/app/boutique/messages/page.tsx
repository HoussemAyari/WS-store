"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

type Message = { id: string; sender_role: "shop" | "depot"; body: string; created_at: string };

export default function MessagesPage() {
  const [texte, setTexte] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const actualiser = async () => {
      try {
        const response = await fetch("/api/shop/messages", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erreur || "Impossible de charger la conversation.");
        if (active) { setMessages(data.messages); setErreur(""); }
      } catch (error) {
        if (active) setErreur(error instanceof Error ? error.message : "Impossible de charger la conversation.");
      } finally { if (active) setLoading(false); }
    };
    void actualiser();
    const timer = window.setInterval(() => { void actualiser(); }, 15000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!texte.trim()) return;
    setSending(true);
    setErreur("");
    setMessage("");
    try {
      const response = await fetch("/api/shop/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: texte.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "Le message n’a pas pu être envoyé.");
      setMessages((current) => [...current, data.message]);
      setTexte("");
      setMessage("Message envoyé au dépôt.");
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Le message n’a pas pu être envoyé.");
    } finally { setSending(false); }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#f7f6f2]">
      <header className="flex min-h-20 items-center gap-4 border-b bg-white px-5"><Link href="/boutique" className="touch-target flex items-center rounded-xl border px-4 font-bold">‹ Retour</Link><div><p className="text-sm text-gray-500">Conversation</p><h1 className="font-bold">Dépôt central</h1></div></header>
      <div className="flex-1 space-y-3 p-5">
        {erreur && <p role="alert" className="mx-auto max-w-3xl rounded-2xl bg-red-50 p-4 font-semibold text-red-800">{erreur}</p>}
        {message && <p role="status" className="mx-auto max-w-3xl rounded-2xl bg-emerald-50 p-3 text-center font-semibold text-emerald-800">{message}</p>}
        {loading ? <p className="mx-auto max-w-3xl rounded-2xl bg-white p-5">Chargement de la conversation…</p> : messages.length === 0 ? <p className="mx-auto max-w-3xl rounded-2xl bg-white p-5 text-gray-600">Aucun message. Vous pouvez écrire au dépôt.</p> : messages.map((item) => (
          <div key={item.id} className={`max-w-[85%] rounded-[20px] p-4 shadow-sm ${item.sender_role === "shop" ? "ml-auto rounded-br-md bg-[#111111] text-white" : "rounded-bl-md bg-white"}`}><p className="whitespace-pre-wrap">{item.body}</p><time className={`mt-1 block text-xs ${item.sender_role === "shop" ? "opacity-70" : "text-gray-500"}`}>{item.sender_role === "shop" ? "Votre boutique" : "Dépôt central"} · {new Date(item.created_at).toLocaleString("fr-FR")}</time></div>
        ))}
        <div ref={endRef} />
      </div>
      <form onSubmit={envoyer} className="sticky bottom-0 flex gap-3 border-t bg-white p-4">
        <textarea value={texte} onChange={(event) => setTexte(event.target.value)} maxLength={2000} rows={1} className="touch-target min-w-0 flex-1 resize-y rounded-2xl border-2 px-4 py-3" placeholder="Écrire un message" />
        <button disabled={!texte.trim() || sending} className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white disabled:opacity-50">{sending ? "Envoi…" : "Envoyer"}</button>
      </form>
    </main>
  );
}
