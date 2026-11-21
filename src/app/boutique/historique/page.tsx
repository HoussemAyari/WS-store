"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Order = {
  id: string;
  order_date: string;
  status: "nouvelle" | "en_preparation" | "expediee" | "recue";
  general_note: string | null;
  order_items: Array<{
    id: string;
    quantity: number;
    urgent: boolean;
    unavailable: boolean;
    unavailable_note: string | null;
    catalog_items: { name: string; unit: string } | null;
  }>;
};

const filtres = [
  ["Toutes", ""],
  ["Nouvelle", "nouvelle"],
  ["En préparation", "en_preparation"],
  ["Expédiée", "expediee"],
  ["Reçue", "recue"],
];
const statuts: Record<Order["status"], string> = {
  nouvelle: "Nouvelle",
  en_preparation: "En préparation",
  expediee: "Expédiée",
  recue: "Reçue",
};

export default function HistoriqueBoutique() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtre, setFiltre] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const visibles = useMemo(() => orders.filter((order) => !filtre || order.status === filtre), [orders, filtre]);

  async function charger() {
    const response = await fetch("/api/shop/orders", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erreur || "Impossible de charger l’historique.");
    setOrders(data.orders);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/shop/orders", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erreur || "Impossible de charger l’historique.");
        if (active) setOrders(data.orders);
      })
      .catch((error: unknown) => { if (active) setErreur(error instanceof Error ? error.message : "Impossible de charger l’historique."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function action(order: Order, type: "repeat" | "received") {
    setBusy(order.id);
    setErreur("");
    setMessage("");
    try {
      const response = type === "repeat"
        ? await fetch("/api/shop/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sourceOrderId: order.id }),
          })
        : await fetch("/api/shop/orders", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: order.id, action: "confirm_received" }),
          });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "L’action n’a pas pu être effectuée.");
      if (type === "repeat") setMessage("La commande a été recommandée pour aujourd’hui.");
      else setMessage("Réception confirmée. Merci.");
      await charger();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "L’action n’a pas pu être effectuée.");
    } finally {
      setBusy("");
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 sm:p-8">
      <Link href="/boutique" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <h1 className="mt-5 text-3xl font-bold">Historique</h1>
      {erreur && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 font-semibold text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</p>}
      <div className="mt-6 flex gap-3 overflow-x-auto">
        {filtres.map(([nom, valeur]) => (
          <button key={nom} type="button" aria-pressed={filtre === valeur} onClick={() => setFiltre(valeur)} className={`touch-target shrink-0 rounded-2xl px-5 font-bold ${filtre === valeur ? "bg-[#111111] text-white" : "border-2 bg-white"}`}>{nom}</button>
        ))}
      </div>
      {loading ? <p className="mt-5 rounded-2xl bg-white p-6">Chargement de l’historique…</p> : visibles.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-white p-6 text-gray-600">Aucune commande pour ce filtre.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {visibles.map((order) => (
            <article key={order.id} className="rounded-[24px] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="font-bold">{new Date(`${order.order_date}T12:00:00`).toLocaleDateString("fr-FR", { dateStyle: "long" })}</p><p className="mt-1 text-gray-600">{order.order_items.length} articles</p></div>
                <span className="rounded-full bg-[#efeadf] px-4 py-2 font-bold">{statuts[order.status]}</span>
              </div>
              {order.general_note && <p className="mt-3 rounded-xl bg-[#f7f6f2] p-3">{order.general_note}</p>}
              <ul className="mt-4 space-y-2">
                {order.order_items.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                    <span>{item.catalog_items?.name ?? "Article"}{item.urgent && <strong className="ml-2 text-red-700">Urgent</strong>}</span>
                    <span>{item.catalog_items?.unit === "unités" ? `${item.quantity} unités` : "Sélectionné"}</span>
                    {item.unavailable && <p className="w-full font-semibold text-red-700">Indisponible : {item.unavailable_note}</p>}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap justify-end gap-3">
                {order.status === "expediee" && <button disabled={busy === order.id} onClick={() => void action(order, "received")} className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white disabled:opacity-50">{busy === order.id ? "En cours…" : "Confirmer la réception"}</button>}
                <button disabled={busy === order.id} onClick={() => void action(order, "repeat")} className="touch-target rounded-2xl border-2 px-5 font-bold disabled:opacity-50">{busy === order.id ? "En cours…" : "Recommander"}</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
