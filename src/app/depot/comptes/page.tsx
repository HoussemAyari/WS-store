"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Account = {
  id: string;
  login: string;
  displayName: string;
  role: "shop" | "depot";
  active: boolean;
  shopId: string | null;
  shopName: string | null;
};

type Shop = { id: string; name: string; active: boolean };

export default function ComptesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");
  const [message, setMessage] = useState("");
  const [actionCompte, setActionCompte] = useState<string | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [login, setLogin] = useState("");
  const [nom, setNom] = useState("");
  const [role, setRole] = useState<"shop" | "depot">("shop");
  const [shopId, setShopId] = useState("");
  const [password, setPassword] = useState("");

  const charger = useCallback(async () => {
    setLoading(true);
    setErreur("");
    try {
      const response = await fetch("/api/depot/accounts", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "Impossible de charger les comptes.");
      setAccounts(data.accounts);
      setShops(data.shops);
      if (!shopId && data.shops.length) setShopId(data.shops[0].id);
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Impossible de charger les comptes.");
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => { void charger(); }, [charger]);

  async function agir(body: Record<string, string | boolean | null>) {
    setErreur("");
    setMessage("");
    setActionCompte(typeof body.profileId === "string" ? body.profileId : "create");
    try {
      const response = await fetch("/api/depot/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erreur || "Impossible de modifier le compte.");
      setMessage("La modification du compte a été enregistrée.");
      setPassword("");
      setFormVisible(false);
      await charger();
    } catch (error) {
      setErreur(error instanceof Error ? error.message : "Impossible de modifier le compte.");
    } finally {
      setActionCompte(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] p-5 sm:p-8">
      <Link href="/depot" className="touch-target inline-flex items-center rounded-xl border bg-white px-4 font-bold">‹ Retour</Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm text-gray-500">Accès et autorisations</p><h1 className="text-3xl font-bold">Comptes utilisateurs</h1></div>
        <button onClick={() => setFormVisible((visible) => !visible)} className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white">
          {formVisible ? "Fermer" : "＋ Créer un compte"}
        </button>
      </div>
      <p className="mt-3 max-w-3xl text-gray-600">Les comptes boutique accèdent uniquement à leur espace. Les comptes dépôt gèrent toutes les boutiques et les commandes.</p>

      {erreur && <p role="alert" className="mt-5 rounded-2xl bg-red-50 p-4 font-semibold text-red-800">{erreur}</p>}
      {message && <p role="status" className="mt-5 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">{message}</p>}

      {formVisible && (
        <form onSubmit={(event) => {
          event.preventDefault();
          void agir({ action: "create", login, displayName: nom, role, shopId: role === "shop" ? shopId : null, password });
        }} className="mt-6 grid max-w-4xl gap-4 rounded-[24px] bg-white p-6 sm:grid-cols-2">
          <label className="block"><span className="mb-2 block font-bold">Nom affiché</span><input required minLength={2} value={nom} onChange={(event) => setNom(event.target.value)} className="touch-target w-full rounded-2xl border-2 px-4" /></label>
          <label className="block"><span className="mb-2 block font-bold">Identifiant de connexion</span><input required minLength={2} value={login} onChange={(event) => setLogin(event.target.value)} className="touch-target w-full rounded-2xl border-2 px-4" /></label>
          <label className="block"><span className="mb-2 block font-bold">Type de compte</span><select value={role} onChange={(event) => setRole(event.target.value as "shop" | "depot")} className="touch-target w-full rounded-2xl border-2 bg-white px-4"><option value="shop">Boutique</option><option value="depot">Dépôt</option></select></label>
          {role === "shop" && <label className="block"><span className="mb-2 block font-bold">Boutique</span><select required value={shopId} onChange={(event) => setShopId(event.target.value)} className="touch-target w-full rounded-2xl border-2 bg-white px-4">{shops.filter((shop) => shop.active).map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select></label>}
          <label className="block sm:col-span-2"><span className="mb-2 block font-bold">Mot de passe temporaire (12 caractères minimum)</span><input required minLength={12} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="touch-target w-full rounded-2xl border-2 px-4" /></label>
          <button disabled={actionCompte === "create"} className="touch-target rounded-2xl bg-[#111111] px-5 font-bold text-white disabled:opacity-50 sm:col-span-2">Créer le compte</button>
        </form>
      )}

      {loading ? <p className="mt-8 rounded-2xl bg-white p-6">Chargement des comptes…</p> : (
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {accounts.map((account) => (
            <article key={account.id} className="rounded-[24px] bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-[#a58b50]">{account.role === "depot" ? "Dépôt central · Accès complet" : `Boutique · ${account.shopName ?? "Non affectée"}`}</p>
                  <h2 className="mt-1 text-xl font-bold">{account.displayName}</h2>
                  <p className="mt-1 text-gray-500">Identifiant : {account.login}</p>
                </div>
                <span className={`rounded-full px-3 py-2 text-sm font-bold ${account.active ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{account.active ? "Actif" : "Désactivé"}</span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <input aria-label={`Nouveau mot de passe pour ${account.displayName}`} type="password" autoComplete="new-password" minLength={12} placeholder="Nouveau mot de passe (12 caractères min.)" value={actionCompte === `password-${account.id}` ? password : ""} onChange={(event) => { setActionCompte(`password-${account.id}`); setPassword(event.target.value); }} className="touch-target min-w-0 rounded-2xl border-2 px-4" />
                <button disabled={actionCompte === account.id || !password || (actionCompte !== `password-${account.id}`)} onClick={() => void agir({ action: "reset_password", profileId: account.id, password })} className="touch-target rounded-2xl border-2 px-4 font-bold disabled:opacity-40">Changer le mot de passe</button>
              </div>
              <button disabled={actionCompte === account.id} onClick={() => void agir({ action: "set_active", profileId: account.id, active: !account.active })} className="touch-target mt-3 w-full rounded-2xl border-2 font-bold disabled:opacity-40">
                {account.active ? "Désactiver ce compte" : "Réactiver ce compte"}
              </button>
            </article>
          ))}
          {!accounts.length && <p className="rounded-2xl bg-white p-6">Aucun compte disponible.</p>}
        </section>
      )}
    </main>
  );
}
