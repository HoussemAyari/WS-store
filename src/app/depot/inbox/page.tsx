import Link from "next/link";

const entries = [
  { type: "Produit pour un client", titre: "Huile Oud — Mme Ben Ali", boutique: "Kram", statut: "À traiter" },
  { type: "Recommandation", titre: "Ajouter des flacons verts", boutique: "Djerba", statut: "Nouveau" },
  { type: "Message", titre: "La livraison du matin est-elle confirmée ?", boutique: "Rue des Salines", statut: "Répondre" },
];

export default function InboxPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 sm:p-8">
      <Link href="/depot" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <h1 className="mt-5 text-3xl font-bold">Boîte de réception</h1>
      <div className="mt-6 space-y-4">
        {entries.map((entry) => (
          <article key={entry.titre} className="rounded-[24px] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm font-bold text-[#a58b50]">{entry.type} · {entry.boutique}</p><h2 className="mt-2 text-xl font-bold">{entry.titre}</h2></div>
              <button className="touch-target shrink-0 rounded-2xl bg-[#111111] px-5 font-bold text-white">{entry.statut}</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
