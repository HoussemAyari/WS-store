"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  order_date: string;
  status: "nouvelle" | "en_preparation" | "expediee" | "recue";
  general_note: string | null;
  shops: { name: string } | null;
  order_items: Array<{ id: string; quantity: number; urgent: boolean; item_note: string | null; unavailable: boolean; unavailable_note: string | null; catalog_items: { name: string; unit: string } | null }>;
};
const labels: Record<Order["status"], string> = { nouvelle: "Nouvelle", en_preparation: "En préparation", expediee: "Expédiée", recue: "Reçue" };
const filtres = [["Toutes", ""], ["Nouvelle", "nouvelle"], ["En préparation", "en_preparation"], ["Expédiée", "expediee"], ["Reçue", "recue"]];

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export default function HistoriqueDepot() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("");
  const [shop, setShop] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");
  const [expanded, setExpanded] = useState("");
  const visibles = useMemo(() => orders.filter((order) =>
    (!status || order.status === status) &&
    (!shop || order.shops?.name === shop) &&
    (!from || order.order_date >= from) &&
    (!to || order.order_date <= to)
  ), [orders, status, shop, from, to]);
  const shops = useMemo(() => Array.from(new Set(orders.map((order) => order.shops?.name).filter((name): name is string => Boolean(name)))).sort(), [orders]);

  useEffect(() => {
    let active = true;
    fetch("/api/depot/orders", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erreur || "Impossible de charger l’historique.");
        if (active) setOrders(data.orders);
      })
      .catch((error: unknown) => { if (active) setErreur(error instanceof Error ? error.message : "Impossible de charger l’historique."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function exporter() {
    const header = ["Date", "Boutique", "Statut", "Article", "Quantité", "Urgent", "Indisponible", "Note article", "Note commande"];
    const rows = visibles.flatMap((order) => order.order_items.map((item) => [
      order.order_date,
      order.shops?.name ?? "Boutique",
      labels[order.status],
      item.catalog_items?.name ?? "Article",
      item.catalog_items?.unit === "unités" ? item.quantity : "",
      item.urgent ? "Oui" : "Non",
      item.unavailable ? item.unavailable_note || "Oui" : "Non",
      item.item_note ?? "",
      order.general_note ?? "",
    ]));
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `historique-commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 sm:p-8">
      <Link href="/depot" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold">Historique complet</h1><p className="mt-1 text-gray-600">{visibles.length} commandes</p></div><button disabled={visibles.length === 0} onClick={exporter} className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white disabled:opacity-40">Exporter CSV</button></div>
      <section className="mt-6 grid gap-3 rounded-[24px] bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <label><span className="mb-1 block font-semibold">Boutique</span><select value={shop} onChange={(event) => setShop(event.target.value)} className="touch-target w-full rounded-xl border-2 bg-white px-3"><option value="">Toutes les boutiques</option>{shops.map((name) => <option key={name}>{name}</option>)}</select></label>
        <label><span className="mb-1 block font-semibold">Statut</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="touch-target w-full rounded-xl border-2 bg-white px-3">{filtres.map(([name, value]) => <option key={name} value={value}>{name}</option>)}</select></label>
        <label><span className="mb-1 block font-semibold">Du</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="touch-target w-full rounded-xl border-2 px-3" /></label>
        <label><span className="mb-1 block font-semibold">Au</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="touch-target w-full rounded-xl border-2 px-3" /></label>
      </section>
      {erreur && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 font-semibold text-red-800">{erreur}</p>}
      {loading ? <p className="mt-5 rounded-2xl bg-white p-6">Chargement de l’historique…</p> : visibles.length === 0 ? <p className="mt-5 rounded-2xl bg-white p-6 text-gray-600">Aucune commande pour ces filtres.</p> : <div className="mt-5 space-y-3">{visibles.map((order) => <article key={order.id} className="rounded-[24px] bg-white p-5 shadow-sm">
        <button onClick={() => setExpanded(expanded === order.id ? "" : order.id)} aria-expanded={expanded === order.id} className="touch-target flex h-auto min-h-16 w-full flex-wrap items-center justify-between gap-3 text-left">
          <span><strong>{order.shops?.name ?? "Boutique"}</strong><span className="ml-3 text-gray-600">{new Date(`${order.order_date}T12:00:00`).toLocaleDateString("fr-FR")}</span></span><span className="rounded-full bg-[#efeadf] px-4 py-2 font-semibold">{labels[order.status]} · {order.order_items.length} articles</span>
        </button>
        {expanded === order.id && <div className="mt-3 border-t pt-3">{order.general_note && <p className="mb-3 rounded-xl bg-[#f7f6f2] p-3">{order.general_note}</p>}<ul className="space-y-2">{order.order_items.map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2"><span>{item.catalog_items?.name ?? "Article"}{item.urgent && <strong className="ml-2 text-red-700">Urgent</strong>}</span><span>{item.catalog_items?.unit === "unités" ? `${item.quantity} unités` : "Sélectionné"}</span>{item.unavailable && <p className="w-full font-semibold text-red-700">Indisponible : {item.unavailable_note}</p>}</li>)}</ul></div>}
      </article>)}</div>}
    </main>
  );
}
