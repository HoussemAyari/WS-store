"use client";

import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

const shops = [
  { nom: "Kram", statut: "En préparation", articles: 14, couleur: "border-[#b79a5a]" },
  { nom: "Rue des Salines", statut: "Nouvelle", articles: 9, couleur: "border-red-400" },
  { nom: "Djerba", statut: "Expédiée", articles: 11, couleur: "border-emerald-500" },
];

export default function DepotDashboard() {
  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      <header className="flex min-h-20 items-center justify-between border-b bg-white px-5 sm:px-8">
        <div><p className="text-sm text-gray-500">Dépôt central</p><h1 className="text-xl font-bold">Aujourd’hui</h1></div>
        <nav className="flex gap-2">
          <Link href="/depot/inbox" className="touch-target flex items-center rounded-xl border px-4 font-bold">Boîte de réception</Link>
          <LogoutButton />
        </nav>
      </header>
      <div className="p-5 sm:p-8">
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] bg-[#111111] p-6 text-white"><p>Commandes du jour</p><strong className="mt-2 block text-4xl">3</strong></div>
          <div className="rounded-[24px] border bg-white p-6"><p>À préparer</p><strong className="mt-2 block text-4xl">34</strong></div>
          <div className="rounded-[24px] border bg-white p-6"><p>Articles demandés</p><strong className="mt-2 block text-4xl">26</strong></div>
        </div>
        <h2 className="mb-4 text-xl font-bold">Commandes des boutiques</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {shops.map((shop) => (
            <article key={shop.nom} className={`rounded-[24px] border-l-4 ${shop.couleur} bg-white p-6 shadow-sm`}>
              <p className="text-sm text-gray-500">{shop.statut}</p>
              <h3 className="mt-1 text-2xl font-bold">{shop.nom}</h3>
              <p className="mt-3 text-gray-600">{shop.articles} articles</p>
              <button className="touch-target mt-5 w-full rounded-2xl border-2 font-bold">Voir la commande</button>
            </article>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/depot/catalogue" className="touch-target flex items-center rounded-2xl border bg-white px-5 font-bold">Catalogue</Link>
          <Link href="/depot/comptes" className="touch-target flex items-center rounded-2xl border bg-white px-5 font-bold">Boutiques</Link>
          <Link href="/depot/historique" className="touch-target flex items-center rounded-2xl border bg-white px-5 font-bold">Historique</Link>
          <button onClick={() => window.print()} className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white">Imprimer la feuille</button>
        </div>
      </div>
    </main>
  );
}
