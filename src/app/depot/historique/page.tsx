import Link from "next/link";

export default function HistoriqueDepot() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 sm:p-8">
      <Link href="/depot" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <div className="mt-5 flex items-center justify-between gap-4"><h1 className="text-3xl font-bold">Historique complet</h1><button className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white">Exporter CSV</button></div>
      <div className="mt-6 rounded-[24px] bg-white p-6"><p className="text-gray-600">Aucune commande ancienne pour cette sélection.</p></div>
    </main>
  );
}
