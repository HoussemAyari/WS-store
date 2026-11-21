"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type Category = { id: string; name: string; active: boolean };
type Item = { id: string; name: string; unit: "selection" | "unités"; active: boolean; category_id: string; catalog_categories: { name: string } | null };
type FormValue = { name: string; categoryId: string; unit: "selection" | "unités" };
const vide: FormValue = { name: "", categoryId: "", unit: "selection" };

export default function CataloguePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormValue>(vide);
  const [editing, setEditing] = useState<Item | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");

  const charger = useCallback(async () => {
    const response = await fetch("/api/depot/catalog", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.erreur || "Impossible de charger le catalogue.");
    setItems(data.items);
    setCategories(data.categories);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/depot/catalog", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.erreur || "Impossible de charger le catalogue.");
        if (active) { setItems(data.items); setCategories(data.categories); }
      })
      .catch((error: unknown) => { if (active) setErreur(error instanceof Error ? error.message : "Impossible de charger le catalogue."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function ouvrir(item?: Item) {
    setEditing(item ?? null);
    setForm(item ? { name: item.name, categoryId: item.category_id, unit: item.unit } : { ...vide, categoryId: categories.find((category) => category.active)?.id ?? "" });
    setErreur("");
    setShowForm(true);
  }

  async function enregistrer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("form");
    setErreur("");
    setMessage("");
    try {
      const response = await fetch("/api/depot/catalog", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing ? { id: editing.id, ...form } : form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "L’article n’a pas pu être enregistré.");
      setShowForm(false);
      setMessage(editing ? "Article modifié." : "Article ajouté.");
      await charger();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "L’article n’a pas pu être enregistré.");
    } finally { setBusy(""); }
  }

  async function basculer(item: Item) {
    setBusy(item.id);
    setErreur("");
    setMessage("");
    try {
      const response = await fetch("/api/depot/catalog", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, active: !item.active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "L’article n’a pas pu être modifié.");
      setMessage(item.active ? "Article masqué du catalogue." : "Article réactivé.");
      await charger();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "L’article n’a pas pu être modifié.");
    } finally { setBusy(""); }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 sm:p-8">
      <Link href="/depot" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold">Catalogue</h1><p className="mt-1 text-gray-600">{items.length} articles</p></div>
        <button onClick={() => ouvrir()} className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white">＋ Ajouter un article</button>
      </div>
      {erreur && <p role="alert" className="mt-4 rounded-2xl bg-red-50 p-4 font-semibold text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</p>}
      {showForm && <form onSubmit={enregistrer} className="mt-5 grid gap-4 rounded-[24px] bg-white p-6 md:grid-cols-3">
        <label><span className="mb-2 block font-bold">Nom de l’article</span><input required maxLength={160} value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} className="touch-target w-full rounded-xl border-2 px-3" /></label>
        <label><span className="mb-2 block font-bold">Catégorie</span><select required value={form.categoryId} onChange={(event) => setForm((value) => ({ ...value, categoryId: event.target.value }))} className="touch-target w-full rounded-xl border-2 bg-white px-3">{categories.filter((category) => category.active || category.id === form.categoryId).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label><span className="mb-2 block font-bold">Type de commande</span><select value={form.unit} onChange={(event) => setForm((value) => ({ ...value, unit: event.target.value as FormValue["unit"] }))} className="touch-target w-full rounded-xl border-2 bg-white px-3"><option value="selection">Sélection uniquement</option><option value="unités">Nombre d’unités</option></select></label>
        <div className="flex flex-wrap gap-3 md:col-span-3"><button disabled={busy === "form"} className="touch-target rounded-xl bg-[#111111] px-5 font-bold text-white disabled:opacity-50">{busy === "form" ? "Enregistrement…" : "Enregistrer"}</button><button type="button" onClick={() => setShowForm(false)} className="touch-target rounded-xl border px-5 font-bold">Annuler</button></div>
      </form>}
      {loading ? <p className="mt-6 rounded-2xl bg-white p-6">Chargement du catalogue…</p> : items.length === 0 ? <p className="mt-6 rounded-2xl bg-white p-6">Aucun article dans le catalogue.</p> : <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => <article key={item.id} className={`rounded-[24px] bg-white p-5 shadow-sm ${!item.active ? "opacity-60" : ""}`}>
          <p className="text-sm text-gray-500">{item.catalog_categories?.name ?? "Sans catégorie"}{!item.active && " · Masqué"}</p>
          <h2 className="mt-1 text-xl font-bold">{item.name}</h2><p className="mt-1 text-gray-600">{item.unit === "unités" ? "Nombre d’unités" : "Sélection uniquement"}</p>
          <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => ouvrir(item)} className="touch-target rounded-xl border-2 font-bold">Modifier</button><button disabled={busy === item.id} onClick={() => void basculer(item)} className="touch-target rounded-xl border font-semibold disabled:opacity-50">{busy === item.id ? "…" : item.active ? "Masquer" : "Réactiver"}</button></div>
        </article>)}
      </div>}
    </main>
  );
}
