"use client";

import Link from "next/link";
import { useState } from "react";

export default function EnvoyerPage() {
  const [type, setType] = useState("Note");
  const types = ["Note", "Recommandation", "Produit pour client", "Produit pour stock"];
  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 pb-28 sm:p-8">
      <Link href="/boutique" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <h1 className="mt-5 text-3xl font-bold">Envoyer au dépôt</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {types.map((nom) => (
          <button key={nom} onClick={() => setType(nom)} className={`touch-target rounded-2xl border-2 px-5 font-bold ${type === nom ? "border-[#111111] bg-[#111111] text-white" : "border-[#dedbd3] bg-white"}`}>{nom}</button>
        ))}
      </div>
      <div className="mt-6 max-w-3xl space-y-5 rounded-[24px] bg-white p-6">
        {type === "Produit pour client" && (
          <label className="block"><span className="mb-2 block font-bold">Nom du client (facultatif)</span><input className="touch-target w-full rounded-2xl border-2 px-4" /></label>
        )}
        <label className="block"><span className="mb-2 block font-bold">Description</span><textarea className="min-h-32 w-full rounded-2xl border-2 p-4" placeholder="Écrivez ici..." /></label>
        <label className="touch-target flex cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed px-4 font-bold">＋ Ajouter une photo<input type="file" accept="image/*" capture="environment" className="hidden" /></label>
      </div>
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4"><button className="touch-target mx-auto block w-full max-w-2xl rounded-2xl bg-[#111111] text-lg font-bold text-white">Envoyer au dépôt</button></div>
    </main>
  );
}
