"use client";

import Link from "next/link";
import { useState } from "react";

export default function MessagesPage() {
  const [texte, setTexte] = useState("");
  const [messages, setMessages] = useState(["Bonjour, pouvez-vous confirmer la livraison ?"]);
  return (
    <main className="flex min-h-screen flex-col bg-[#f7f6f2]">
      <header className="flex min-h-20 items-center gap-4 border-b bg-white px-5"><Link href="/boutique" className="touch-target flex items-center rounded-xl border px-4 font-bold">‹ Retour</Link><div><p className="text-sm text-gray-500">Conversation</p><h1 className="font-bold">Dépôt central</h1></div></header>
      <div className="flex-1 space-y-3 p-5">
        {messages.map((message, index) => (
          <div key={index} className="ml-auto max-w-[85%] rounded-[20px] rounded-br-md bg-[#111111] p-4 text-white"><p>{message}</p><time className="mt-1 block text-xs opacity-70">Envoyé à l’instant</time></div>
        ))}
        <div className="max-w-[85%] rounded-[20px] rounded-bl-md bg-white p-4 shadow-sm"><p>Bonjour. Votre livraison est prévue avant 16 h.</p><time className="mt-1 block text-xs text-gray-500">Dépôt central · 10:32</time></div>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); if (texte.trim()) { setMessages((liste) => [...liste, texte.trim()]); setTexte(""); } }} className="flex gap-3 border-t bg-white p-4">
        <input value={texte} onChange={(event) => setTexte(event.target.value)} className="touch-target min-w-0 flex-1 rounded-2xl border-2 px-4" placeholder="Écrire un message" />
        <button className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white">Envoyer</button>
      </form>
    </main>
  );
}
