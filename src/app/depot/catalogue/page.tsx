import Link from "next/link";
import catalogueImporte from "@/data/catalogue.json";

export default function CataloguePage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 sm:p-8">
      <Link href="/depot" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <div className="mt-5 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Catalogue</h1>
        <button className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white">＋ Ajouter</button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {catalogueImporte.map((article) => (
          <article key={article.id} className="rounded-[24px] bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">{article.categorie}</p>
            <h2 className="mt-1 text-xl font-bold">{article.nom}</h2>
            <button className="touch-target mt-5 w-full rounded-2xl border-2 font-bold">Modifier</button>
          </article>
        ))}
      </div>
    </main>
  );
}
