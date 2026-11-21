"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const categories = ["Huiles de parfum", "Matières premières", "Flacons", "Vaporisateurs", "Capuchons / Bouchons", "Autres"];
type Article = { id: string; nom: string; categorie: string; avecQuantite: boolean };
type ExistingOrder = {
  id: string;
  order_date: string;
  status: "nouvelle" | "en_preparation" | "expediee" | "recue";
  general_note: string | null;
  order_items: Array<{ item_id: string; quantity: number; urgent: boolean; item_note: string | null }>;
};

export default function CommandePage() {
  const router = useRouter();
  const [categorie, setCategorie] = useState(categories[0]);
  const [recherche, setRecherche] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [urgent, setUrgent] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteGenerale, setNoteGenerale] = useState("");
  const [orderId, setOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState<ExistingOrder["status"] | "">("");
  const [envoye, setEnvoye] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/catalog", { cache: "no-store" }),
      fetch("/api/shop/orders", { cache: "no-store" }),
    ])
      .then(async ([catalogResponse, ordersResponse]) => {
        const [catalogData, ordersData] = await Promise.all([catalogResponse.json(), ordersResponse.json()]);
        if (!catalogResponse.ok) throw new Error(catalogData.erreur || "Impossible de charger le catalogue.");
        if (!ordersResponse.ok) throw new Error(ordersData.erreur || "Impossible de charger la commande du jour.");
        if (!active) return;
        setArticles(catalogData.articles);
        const existing = (ordersData.orders as ExistingOrder[]).find((order) => order.order_date === ordersData.today);
        if (!existing) return;
        setOrderId(existing.id);
        setOrderStatus(existing.status);
        setNoteGenerale(existing.general_note ?? "");
        setSelection(Object.fromEntries(existing.order_items.map((item) => [item.item_id, item.quantity])));
        setUrgent(Object.fromEntries(existing.order_items.map((item) => [item.item_id, item.urgent])));
        setNotes(Object.fromEntries(existing.order_items.map((item) => [item.item_id, item.item_note ?? ""])));
      })
      .catch((error: unknown) => {
        if (active) setErreur(error instanceof Error ? error.message : "Impossible de charger le catalogue.");
      })
      .finally(() => { if (active) setChargement(false); });
    return () => { active = false; };
  }, []);

  const filtres = articles.filter((article) => article.categorie === categorie && article.nom.toLowerCase().includes(recherche.toLowerCase()));
  const nombreArticles = useMemo(() => Object.values(selection).filter((quantite) => quantite > 0).length, [selection]);

  function modifier(id: string, delta: number) {
    setSelection((courant) => ({ ...courant, [id]: Math.max(0, (courant[id] ?? 0) + delta) }));
  }

  async function envoyerCommande() {
    if (envoi || nombreArticles === 0 || (orderId && orderStatus !== "nouvelle")) return;
    setEnvoi(true);
    setErreur("");
    try {
      const response = await fetch("/api/shop/orders", {
        method: orderId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderId ? {
          action: "update",
          orderId,
          generalNote: noteGenerale,
          items: articles.filter((article) => selection[article.id] > 0).map((article) => ({
            itemId: article.id,
            quantity: article.avecQuantite ? selection[article.id] : 1,
            urgent: urgent[article.id] ?? false,
            note: notes[article.id] ?? "",
          })),
        } : {
          generalNote: noteGenerale,
          items: articles.filter((article) => selection[article.id] > 0).map((article) => ({
            itemId: article.id,
            quantity: article.avecQuantite ? selection[article.id] : 1,
            urgent: urgent[article.id] ?? false,
            note: notes[article.id] ?? "",
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "La commande n’a pas pu être envoyée.");
      setEnvoye(false);
      if (orderId) {
        setErreur("");
        setOrderStatus("nouvelle");
      }
      router.push("/boutique/historique");
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "La commande n’a pas pu être envoyée.");
      setEnvoye(false);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] pb-28">
      <header className="sticky top-0 z-10 flex min-h-20 items-center gap-4 border-b bg-white px-5">
        <Link href="/boutique" className="touch-target flex items-center justify-center rounded-xl border px-4 font-bold">‹ Retour</Link>
        <h1 className="text-xl font-bold">{orderId ? "Commande du jour" : "Nouvelle commande"}</h1>
      </header>
      <div className="p-5">
        {erreur && <p role="alert" className="mb-4 rounded-2xl bg-red-50 p-4 font-semibold text-red-800">{erreur}</p>}
        {orderId && <p role="status" className={`mb-4 rounded-2xl p-4 font-semibold ${orderStatus === "nouvelle" ? "bg-amber-50 text-amber-900" : "bg-gray-100 text-gray-800"}`}>
          {orderStatus === "nouvelle" ? "Votre commande est enregistrée. Vous pouvez encore la modifier jusqu’au début de la préparation." : "La préparation a commencé. Votre commande du jour n’est plus modifiable."}
        </p>}
        <input className="touch-target w-full rounded-2xl border-2 border-[#dedbd3] bg-white px-5 text-lg" value={recherche} onChange={(event) => setRecherche(event.target.value)} placeholder="Rechercher un article" />
        <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
          {categories.map((nom) => (
            <button key={nom} type="button" onClick={() => setCategorie(nom)} className={`touch-target shrink-0 rounded-2xl px-5 font-bold ${categorie === nom ? "bg-[#111111] text-white" : "border-2 border-[#dedbd3] bg-white"}`}>{nom}</button>
          ))}
        </div>
        <label className="mt-4 block max-w-3xl"><span className="mb-2 block font-bold">Note pour le dépôt (facultatif)</span><textarea disabled={Boolean(orderId && orderStatus !== "nouvelle")} value={noteGenerale} onChange={(event) => setNoteGenerale(event.target.value)} maxLength={1000} className="min-h-20 w-full rounded-2xl border-2 bg-white p-4 disabled:bg-gray-100" placeholder="Précision sur la commande…" /></label>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chargement && <p className="rounded-2xl bg-white p-5">Chargement du catalogue…</p>}
          {!chargement && filtres.length === 0 && <p className="rounded-2xl bg-white p-5">{erreur ? "Le catalogue est indisponible." : "Aucun article dans cette catégorie."}</p>}
          {filtres.map((article) => (
            <article key={article.id} className="rounded-[24px] border border-[#e7e3da] bg-white p-5 shadow-sm">
              <h2 className="min-h-14 text-lg font-bold">{article.nom}</h2>
              {article.avecQuantite ? (
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f7f6f2] p-2">
                  <button type="button" disabled={Boolean(orderId && orderStatus !== "nouvelle")} aria-label={`Retirer une unité de ${article.nom}`} onClick={() => modifier(article.id, -1)} className="touch-target rounded-xl border bg-white text-2xl font-bold disabled:opacity-40">−</button>
                  <strong className="text-2xl">{selection[article.id] ?? 0}</strong>
                  <button type="button" disabled={Boolean(orderId && orderStatus !== "nouvelle")} aria-label={`Ajouter une unité de ${article.nom}`} onClick={() => modifier(article.id, 1)} className="touch-target rounded-xl bg-[#111111] text-2xl font-bold text-white disabled:opacity-40">＋</button>
                </div>
              ) : (
                <button type="button" disabled={Boolean(orderId && orderStatus !== "nouvelle")} onClick={() => modifier(article.id, (selection[article.id] ?? 0) ? -1 : 1)} className={`touch-target mt-4 w-full rounded-2xl border-2 font-bold disabled:opacity-40 ${selection[article.id] ? "border-[#111111] bg-[#111111] text-white" : "border-[#dedbd3] bg-white"}`}>
                  {selection[article.id] ? "Sélectionné" : "Sélectionner"}
                </button>
              )}
              {selection[article.id] > 0 && (
                <div className="mt-4 space-y-3">
                  <label className="flex min-h-12 items-center gap-3 font-semibold"><input type="checkbox" disabled={Boolean(orderId && orderStatus !== "nouvelle")} className="h-6 w-6 accent-[#111111]" checked={urgent[article.id] ?? false} onChange={(event) => setUrgent((state) => ({ ...state, [article.id]: event.target.checked }))} /> Urgent</label>
                  <input disabled={Boolean(orderId && orderStatus !== "nouvelle")} value={notes[article.id] ?? ""} onChange={(event) => setNotes((state) => ({ ...state, [article.id]: event.target.value }))} maxLength={300} className="touch-target w-full rounded-xl border px-3 disabled:bg-gray-100" placeholder="Note pour cet article" />
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 shadow-[0_-8px_30px_rgba(0,0,0,.08)]">
        <button type="button" disabled={chargement || envoi || nombreArticles === 0 || Boolean(orderId && orderStatus !== "nouvelle")} onClick={() => setEnvoye(true)} className="touch-target mx-auto flex w-full max-w-2xl items-center justify-center rounded-2xl bg-[#111111] text-lg font-bold text-white disabled:opacity-50">
          {orderId ? "Enregistrer les modifications" : "Envoyer la commande"} · {nombreArticles} articles
        </button>
      </div>
      {envoye && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-5" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6">
            <h2 className="text-2xl font-bold">{orderId ? "Enregistrer les modifications ?" : "Envoyer cette commande ?"}</h2>
            <p className="mt-3 text-gray-600">{orderId ? "Les changements seront transmis au dépôt." : "Vous pourrez la modifier tant que le dépôt n’a pas commencé la préparation."}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button disabled={envoi} onClick={() => setEnvoye(false)} className="touch-target rounded-2xl border-2 font-bold disabled:opacity-50">Annuler</button>
              <button disabled={envoi} onClick={() => void envoyerCommande()} className="touch-target rounded-2xl bg-[#111111] font-bold text-white disabled:opacity-50">{envoi ? "Envoi…" : "Confirmer"}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
