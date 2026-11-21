import Link from "next/link";

const shops = ["Kram", "Rue des Salines", "Djerba"];

export default function ComptesPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 sm:p-8">
      <Link href="/depot" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <div className="mt-5 flex items-center justify-between"><h1 className="text-3xl font-bold">Boutiques</h1><button className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white">＋ Ajouter</button></div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {shops.map((shop) => <article key={shop} className="rounded-[24px] bg-white p-6"><p className="text-sm font-bold text-emerald-700">Compte actif</p><h2 className="mt-2 text-2xl font-bold">{shop}</h2><button className="touch-target mt-5 w-full rounded-2xl border-2 font-bold">Réinitialiser le mot de passe</button></article>)}
      </div>
    </main>
  );
}
