"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const types = [
  { label: "Note", value: "note" },
  { label: "Recommandation", value: "recommandation" },
  { label: "Produit pour client", value: "produit_client" },
  { label: "Produit pour stock", value: "produit_stock" },
];
const statuts: Record<string, string> = { nouveau: "Reçu par le dépôt", en_cours: "En cours", traite: "Traité" };
type Submission = { id: string; type: string; description: string; customer_name: string | null; status: string; created_at: string };

export default function EnvoyerPage() {
  const [type, setType] = useState("note");
  const [description, setDescription] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/shop/submissions", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erreur || "Impossible de charger les envois.");
        if (active) setSubmissions(data.submissions);
      })
      .catch((error: unknown) => { if (active) setErreur(error instanceof Error ? error.message : "Impossible de charger les envois."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function envoyer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!description.trim()) { setErreur("Ajoutez une description avant d’envoyer."); return; }
    setSending(true);
    setErreur("");
    setMessage("");
    try {
      const response = await fetch("/api/shop/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description: description.trim(), customerName: type === "produit_client" ? customerName.trim() : "" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "L’envoi n’a pas pu être enregistré.");
      setDescription("");
      setCustomerName("");
      setMessage("Votre envoi a bien été transmis au dépôt.");
      const listResponse = await fetch("/api/shop/submissions", { cache: "no-store" });
      const listData = await listResponse.json();
      if (!listResponse.ok) throw new Error(listData.erreur || "Envoi transmis, mais l’historique n’a pas pu être actualisé.");
      setSubmissions(listData.submissions);
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "L’envoi n’a pas pu être enregistré.");
    } finally { setSending(false); }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 pb-28 sm:p-8">
      <Link href="/boutique" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <h1 className="mt-5 text-3xl font-bold">Envoyer au dépôt</h1>
      <form onSubmit={envoyer}>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {types.map((item) => <button key={item.value} type="button" aria-pressed={type === item.value} onClick={() => setType(item.value)} className={`touch-target rounded-2xl border-2 px-5 font-bold ${type === item.value ? "border-[#111111] bg-[#111111] text-white" : "border-[#dedbd3] bg-white"}`}>{item.label}</button>)}
        </div>
        <div className="mt-6 max-w-3xl space-y-5 rounded-[24px] bg-white p-6">
          {type === "produit_client" && <label className="block"><span className="mb-2 block font-bold">Nom du client (facultatif)</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={120} className="touch-target w-full rounded-2xl border-2 px-4" /></label>}
          <label className="block"><span className="mb-2 block font-bold">Description</span><textarea required value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} className="min-h-32 w-full rounded-2xl border-2 p-4" placeholder="Écrivez ici..." /></label>
        </div>
        {erreur && <p role="alert" className="mt-4 max-w-3xl rounded-2xl bg-red-50 p-4 font-semibold text-red-800">{erreur}</p>}
        {message && <p role="status" className="mt-4 max-w-3xl rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</p>}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4"><button disabled={sending || !description.trim()} className="touch-target mx-auto block w-full max-w-2xl rounded-2xl bg-[#111111] text-lg font-bold text-white disabled:opacity-50">{sending ? "Envoi en cours…" : "Envoyer au dépôt"}</button></div>
      </form>
      <section className="mt-8 max-w-3xl"><h2 className="mb-3 text-xl font-bold">Mes envois précédents</h2>{loading ? <p className="rounded-2xl bg-white p-5">Chargement…</p> : submissions.length === 0 ? <p className="rounded-2xl bg-white p-5 text-gray-600">Aucun envoi précédent.</p> : <div className="space-y-3">{submissions.map((entry) => <article key={entry.id} className="rounded-2xl bg-white p-5"><div className="flex flex-wrap justify-between gap-2"><strong>{types.find((item) => item.value === entry.type)?.label ?? entry.type}</strong><span className="text-sm text-gray-600">{statuts[entry.status] ?? entry.status}</span></div>{entry.customer_name && <p className="mt-2">Client : {entry.customer_name}</p>}<p className="mt-2 whitespace-pre-wrap">{entry.description}</p><time className="mt-2 block text-sm text-gray-500">{new Date(entry.created_at).toLocaleString("fr-FR")}</time></article>)}</div>}</section>
    </main>
  );
}
