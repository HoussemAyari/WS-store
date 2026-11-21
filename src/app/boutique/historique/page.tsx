import Link from "next/link";

const orders = [
  ["20 novembre", "Reçue", "18 articles"], ["19 novembre", "Expédiée", "12 articles"], ["18 novembre", "Reçue", "24 articles"],
];

export default function HistoriqueBoutique() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 sm:p-8">
      <Link href="/boutique" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <h1 className="mt-5 text-3xl font-bold">Historique</h1>
      <div className="mt-6 flex gap-3 overflow-x-auto">
        {["Toutes", "Nouvelle", "En préparation", "Expédiée", "Reçue"].map((filtre, index) => (
          <button key={filtre} className={`touch-target shrink-0 rounded-2xl px-5 font-bold ${index === 0 ? "bg-[#111111] text-white" : "border-2 bg-white"}`}>{filtre}</button>
        ))}
      </div>
      <div className="mt-5 space-y-4">
        {orders.map(([date, statut, nombre]) => (
          <article key={date} className="rounded-[24px] bg-white p-6 shadow-sm">
            <p className="font-bold">{date}</p><p className="mt-1 text-gray-600">{nombre}</p>
            <div className="mt-4 flex items-center justify-between"><span className="rounded-full bg-[#efeadf] px-4 py-2 font-bold">{statut}</span><button className="touch-target rounded-2xl border-2 px-5 font-bold">Recommander</button></div>
          </article>
        ))}
      </div>
    </main>
  );
}
