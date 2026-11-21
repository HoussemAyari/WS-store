"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoutButton } from "@/components/logout-button";

const sections = [
  { href: "/boutique/commande", titre: "Commander", sousTitre: "Créer la commande du jour", icone: "＋", couleur: "bg-[#111111] text-white" },
  { href: "/boutique/historique", titre: "Historique", sousTitre: "Voir les commandes passées", icone: "↺", couleur: "bg-[#f3f0e7] text-[#111111]" },
  { href: "/boutique/envoyer", titre: "Envoyer au dépôt", sousTitre: "Note, recommandation ou produit", icone: "↑", couleur: "bg-[#e9e4d7] text-[#111111]" },
  { href: "/boutique/messages", titre: "Messages", sousTitre: "Écrire au dépôt", icone: "✉", couleur: "bg-white border-2 border-[#dedbd3] text-[#111111]", badge: "2" },
];

export default function BoutiqueHome() {
  const [shopName, setShopName] = useState("Boutique");
  const [sessionError, setSessionError] = useState("");
  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session indisponible.");
        const data = await response.json();
        setShopName(data.shopName || data.displayName);
      })
      .catch(() => setSessionError("Impossible de charger le nom de la boutique."));
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      <header className="flex min-h-20 items-center justify-between border-b border-[#e5e2da] bg-white px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <Image src="/wael-scents-logo.png" alt="" width={120} height={67} />
          <div>
            <p className="text-sm text-gray-500">Boutique</p>
            <p className="text-lg font-bold">{shopName}</p>
          </div>
        </div>
        <LogoutButton />
      </header>
      <div className="mx-auto max-w-6xl p-5 sm:p-8">
        {sessionError && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 font-semibold text-red-800">{sessionError}</p>}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-[#a58b50]">Aujourd’hui</p>
            <h1 className="mt-1 text-3xl font-bold">Que souhaitez-vous faire ?</h1>
          </div>
        </div>
        <section className="grid gap-5 sm:grid-cols-2">
          {sections.map((section) => (
            <Link key={section.href} href={section.href} className={`relative min-h-44 rounded-[28px] p-7 shadow-sm ${section.couleur}`}>
              {section.badge && <span className="absolute right-5 top-5 flex h-9 min-w-9 items-center justify-center rounded-full bg-red-600 px-2 text-sm font-bold text-white">{section.badge}</span>}
              <span className="text-4xl">{section.icone}</span>
              <h2 className="mt-8 text-2xl font-bold">{section.titre}</h2>
              <p className="mt-1 opacity-70">{section.sousTitre}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
