"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import catalogueImporte from "@/data/catalogue.json";

const categories = ["Huiles de parfum", "Matières premières", "Flacons", "Vaporisateurs", "Capuchons / Bouchons", "Autres"];
const articles = catalogueImporte;

export default function CommandePage() {
  const router = useRouter();
  const [categorie, setCategorie] = useState(categories[0]);
  const [recherche, setRecherche] = useState("");
  const [selection, setSelection] = useState<Record<number, number>>({});
  const [envoye, setEnvoye] = useState(false);
  const filtres = articles.filter((article) => article.categorie === categorie && article.nom.toLowerCase().includes(recherche.toLowerCase()));

  function modifier(id: number, delta: number) {
    setSelection((courant) => ({ ...courant, [id]: Math.max(0, (courant[id] ?? 0) + delta) }));
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] pb-28">
      <header className="sticky top-0 z-10 flex min-h-20 items-center gap-4 border-b bg-white px-5">
        <Link href="/boutique" className="touch-target flex items-center justify-center rounded-xl border px-4 font-bold">‹ Retour</Link>
        <h1 className="text-xl font-bold">Nouvelle commande</h1>
      </header>
      <div className="p-5">
        <input className="touch-target w-full rounded-2xl border-2 border-[#dedbd3] bg-white px-5 text-lg" value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Rechercher un article" />
        <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
          {categories.map((nom) => (
            <button key={nom} type="button" onClick={() => setCategorie(nom)} className={`touch-target shrink-0 rounded-2xl px-5 font-bold ${categorie === nom ? "bg-[#111111] text-white" : "border-2 border-[#dedbd3] bg-white"}`}>{nom}</button>
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtres.map((article) => (
            <article key={article.id} className="rounded-[24px] border border-[#e7e3da] bg-white p-5 shadow-sm">
              <h2 className="min-h-14 text-lg font-bold">{article.nom}</h2>
              {article.avecQuantite ? (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f7f6f2] p-2">
                  <button type="button" onClick={() => modifier(article.id, -1)} className="touch-target rounded-xl border bg-white text-2xl font-bold">−</button>
                  <strong className="text-2xl">{selection[article.id] ?? 0}</strong>
                  <button type="button" onClick={() => modifier(article.id, 1)} className="touch-target rounded-xl bg-[#111111] text-2xl font-bold text-white">＋</button>
                </div>
              ) : (
                <button type="button" onClick={() => modifier(article.id, (selection[article.id] ?? 0) ? -1 : 1)} className={`touch-target mt-4 w-full rounded-2xl border-2 font-bold ${selection[article.id] ? "border-[#111111] bg-[#111111] text-white" : "border-[#dedbd3] bg-white"}`}>
                  {selection[article.id] ? "Sélectionné" : "Sélectionner"}
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 shadow-[0_-8px_30px_rgba(0,0,0,.08)]">
        <button type="button" onClick={() => setEnvoye(true)} className="touch-target mx-auto flex w-full max-w-2xl items-center justify-center rounded-2xl bg-[#111111] text-lg font-bold text-white">
          Envoyer la commande · {Object.keys(selection).length} articles
        </button>
      </div>
      {envoye && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6">
            <h2 className="text-2xl font-bold">Envoyer cette commande ?</h2>
            <p className="mt-3 text-gray-600">Vous pourrez la modifier tant que le dépôt n’a pas commencé la préparation.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={() => setEnvoye(false)} className="touch-target rounded-2xl border-2 font-bold">Annuler</button>
              <button onClick={() => { setEnvoye(false); router.push("/boutique"); }} className="touch-target rounded-2xl bg-[#111111] font-bold text-white">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
