"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LogoutButton } from "@/components/logout-button";

type OrderItem = {
  id: string;
  quantity: number;
  urgent: boolean;
  item_note: string | null;
  unavailable: boolean;
  unavailable_note: string | null;
  catalog_items: { name: string; unit: string } | null;
};
type Order = {
  id: string;
  order_date: string;
  status: "nouvelle" | "en_preparation" | "expediee" | "recue";
  general_note: string | null;
  shops: { name: string } | null;
  order_items: OrderItem[];
};
const labels: Record<Order["status"], string> = {
  nouvelle: "Nouvelle",
  en_preparation: "En préparation",
  expediee: "Expédiée",
  recue: "Reçue",
};

export default function DepotDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [today, setToday] = useState("");
  const todaysOrders = useMemo(() => orders.filter((order) => order.order_date === today), [orders, today]);
  const articlesDemandes = useMemo(() => todaysOrders.flatMap((order) => order.order_items), [todaysOrders]);
  const selectedOrder = orders.find((order) => order.id === selected);

  const charger = useCallback(async () => {
    const response = await fetch("/api/depot/orders", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erreur || "Impossible de charger les commandes.");
    setOrders(data.orders);
    setToday(data.today);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/depot/orders", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erreur || "Impossible de charger les commandes.");
        if (active) { setOrders(data.orders); setToday(data.today); }
      })
      .catch((error: unknown) => { if (active) setErreur(error instanceof Error ? error.message : "Impossible de charger les commandes."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function modifier(body: Record<string, string | boolean>) {
    setBusy(typeof body.orderId === "string" ? body.orderId : String(body.orderItemId));
    setErreur("");
    setMessage("");
    try {
      const response = await fetch("/api/depot/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "La commande n’a pas pu être mise à jour.");
      setMessage("La commande a été mise à jour.");
      await charger();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "La commande n’a pas pu être mise à jour.");
    } finally {
      setBusy("");
    }
  }

  function imprimer(ordersToPrint: Order[]) {
    const rows = new Map<string, { shops: Set<string>; quantity: number; unit: string }>();
    for (const order of ordersToPrint) {
      for (const item of order.order_items) {
        const name = item.catalog_items?.name ?? "Article";
        const row = rows.get(name) ?? { shops: new Set<string>(), quantity: 0, unit: item.catalog_items?.unit ?? "selection" };
        row.shops.add(order.shops?.name ?? "Boutique");
        if (row.unit === "unités") row.quantity += item.quantity;
        rows.set(name, row);
      }
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setErreur("Autorisez les fenêtres d’impression pour imprimer la feuille.");
      return;
    }
    printWindow.document.write("<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><title>Préparation du jour</title><style>body{font-family:Arial;padding:30px}h1{font-size:24px}li{padding:10px;border-bottom:1px solid #ddd}</style></head><body></body></html>");
    const heading = printWindow.document.createElement("h1");
    heading.textContent = `Préparation — ${new Date().toLocaleDateString("fr-FR")}`;
    printWindow.document.body.append(heading);
    const summary = printWindow.document.createElement("p");
    summary.textContent = `${ordersToPrint.length} commandes · ${rows.size} articles distincts`;
    printWindow.document.body.append(summary);
    const list = printWindow.document.createElement("ul");
    rows.forEach((data, name) => {
      const row = printWindow.document.createElement("li");
      const article = printWindow.document.createElement("strong");
      article.textContent = name;
      const quantity = data.unit === "unités" ? ` · ${data.quantity} unités demandées` : "";
      row.append(article, printWindow.document.createTextNode(`${quantity} — ${Array.from(data.shops).join(", ")}`));
      list.append(row);
    });
    printWindow.document.body.append(list);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  const shops = useMemo(() => {
    const grouped = new Map<string, Order[]>();
    todaysOrders.forEach((order) => {
      const name = order.shops?.name ?? "Boutique";
      grouped.set(name, [...(grouped.get(name) ?? []), order]);
    });
    return Array.from(grouped, ([name, shopOrders]) => ({ name, orders: shopOrders }));
  }, [todaysOrders]);

  return (
    <main className="min-h-screen bg-[#f7f6f2]">
      <header className="flex min-h-20 items-center justify-between border-b bg-white px-5 sm:px-8">
        <div><p className="text-sm text-gray-500">Dépôt central</p><h1 className="text-xl font-bold">Aujourd’hui</h1></div>
        <nav className="flex gap-2"><Link href="/depot/inbox" className="touch-target flex items-center rounded-xl border px-4 font-bold">Boîte de réception</Link><LogoutButton /></nav>
      </header>
      <div className="p-5 sm:p-8">
        {erreur && <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 font-semibold text-red-800">{erreur}</p>}
        {message && <p role="status" className="mb-4 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</p>}
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-[24px] bg-[#111111] p-6 text-white"><p>Commandes du jour</p><strong className="mt-2 block text-4xl">{loading ? "…" : todaysOrders.length}</strong></div>
          <div className="rounded-[24px] border bg-white p-6"><p>À préparer</p><strong className="mt-2 block text-4xl">{loading ? "…" : todaysOrders.filter((order) => order.status === "nouvelle" || order.status === "en_preparation").length}</strong></div>
          <div className="rounded-[24px] border bg-white p-6"><p>Articles demandés</p><strong className="mt-2 block text-4xl">{loading ? "…" : articlesDemandes.length}</strong></div>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-bold">Commandes des boutiques</h2><button disabled={todaysOrders.length === 0} onClick={() => imprimer(todaysOrders)} className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white disabled:opacity-40">Imprimer la feuille globale</button></div>
        {loading ? <p className="rounded-2xl bg-white p-6">Chargement des commandes…</p> : shops.length === 0 ? <p className="rounded-2xl bg-white p-6 text-gray-600">Aucune commande pour aujourd’hui.</p> : (
          <div className="grid gap-4 lg:grid-cols-3">
            {shops.map((shop) => {
              const order = shop.orders[0];
              return <article key={shop.name} className="rounded-[24px] border-l-4 border-[#b79a5a] bg-white p-6 shadow-sm">
                <p className="text-sm text-gray-500">{labels[order.status]}</p><h3 className="mt-1 text-2xl font-bold">{shop.name}</h3>
                <p className="mt-3 text-gray-600">{order.order_items.length} articles</p>
                <button onClick={() => setSelected(selected === order.id ? null : order.id)} className="touch-target mt-5 w-full rounded-2xl border-2 font-bold">{selected === order.id ? "Masquer la commande" : "Voir la commande"}</button>
                <button onClick={() => imprimer(shop.orders)} className="touch-target mt-2 w-full rounded-2xl border font-semibold">Imprimer cette boutique</button>
              </article>;
            })}
          </div>
        )}
        {selectedOrder && <section className="mt-6 rounded-[24px] bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-bold">{selectedOrder.shops?.name} · {labels[selectedOrder.status]}</h2>
          {selectedOrder.general_note && <p className="mt-3 rounded-xl bg-[#f7f6f2] p-4">{selectedOrder.general_note}</p>}
          <ul className="mt-4 divide-y">{selectedOrder.order_items.map((item) => <li key={item.id} className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{item.catalog_items?.name ?? "Article"}{item.urgent && <span className="ml-2 text-red-700">Urgent</span>}</p><p className="text-gray-600">{item.catalog_items?.unit === "unités" ? `${item.quantity} unités` : "Sélectionné"}</p>{item.item_note && <p className="text-gray-600">Note : {item.item_note}</p>}{item.unavailable && <p className="font-semibold text-red-700">Indisponible : {item.unavailable_note}</p>}</div>
              <button disabled={busy === item.id || (!item.unavailable && !notes[item.id]?.trim())} onClick={() => void modifier({ action: "unavailable", orderItemId: item.id, unavailable: !item.unavailable, note: notes[item.id] || item.unavailable_note || "" })} className="touch-target rounded-xl border-2 px-4 font-semibold disabled:opacity-50">{item.unavailable ? "Rétablir" : "Indisponible"}</button>
            </div>
            {!item.unavailable && <input aria-label={`Motif indisponibilité ${item.catalog_items?.name ?? ""}`} value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} maxLength={300} placeholder="Motif si indisponible" className="touch-target mt-3 w-full rounded-xl border px-3" />}
          </li>)}</ul>
          {(selectedOrder.status === "nouvelle" || selectedOrder.status === "en_preparation") && <button disabled={busy === selectedOrder.id} onClick={() => void modifier({ action: "status", orderId: selectedOrder.id, status: selectedOrder.status === "nouvelle" ? "en_preparation" : "expediee" })} className="touch-target mt-4 w-full rounded-2xl bg-[#111111] font-bold text-white disabled:opacity-50">{selectedOrder.status === "nouvelle" ? "Commencer la préparation" : "Marquer comme expédiée"}</button>}
        </section>}
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/depot/catalogue" className="touch-target flex items-center rounded-2xl border bg-white px-5 font-bold">Catalogue</Link><Link href="/depot/comptes" className="touch-target flex items-center rounded-2xl border bg-white px-5 font-bold">Comptes utilisateurs</Link><Link href="/depot/historique" className="touch-target flex items-center rounded-2xl border bg-white px-5 font-bold">Historique</Link></div>
      </div>
    </main>
  );
}
