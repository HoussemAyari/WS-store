"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [identifiant, setIdentifiant] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [erreur, setErreur] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setErreur("");
    if (!identifiant || !motDePasse) {
      setErreur("Veuillez renseigner votre identifiant et votre mot de passe.");
      return;
    }
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifiant, motDePasse }),
    });
    const data = await response.json();
    if (!response.ok) {
      setErreur(data.erreur || "Connexion impossible.");
      return;
    }
    router.push(data.redirect);
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_.9fr] bg-white">
      <section className="hidden lg:flex items-center justify-center bg-[#111111] p-16">
        <div className="max-w-xl text-white">
          <div className="mb-12 h-1 w-20 bg-[#b79a5a]" />
          <p className="text-sm uppercase tracking-[0.25em] text-[#cbb889]">Wael Scents Group</p>
          <h1 className="mt-5 text-5xl font-semibold leading-tight">Approvisionnement simple, chaque jour.</h1>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center p-6 sm:p-12">
        <form onSubmit={submit} className="w-full max-w-md">
          <div className="mb-10 flex justify-center">
            <Image src="/wael-scents-logo.png" alt="Wael Scents" width={260} height={145} priority />
          </div>
          <h2 className="text-center text-2xl font-bold text-[#111111]">Connexion</h2>
          <div className="mt-8 space-y-5">
            <label className="block">
              <span className="mb-2 block font-semibold">Identifiant</span>
              <input
                className="touch-target w-full rounded-2xl border-2 border-[#dedbd3] px-5 text-lg outline-none focus:border-[#111111]"
                value={identifiant}
                onChange={(event) => setIdentifiant(event.target.value)}
                autoComplete="username"
                placeholder="Exemple : Kram"
              />
            </label>
            <label className="block">
              <span className="mb-2 block font-semibold">Mot de passe</span>
              <div className="relative">
                <input
                  className="touch-target w-full rounded-2xl border-2 border-[#dedbd3] px-5 pr-28 text-lg outline-none focus:border-[#111111]"
                  value={motDePasse}
                  onChange={(event) => setMotDePasse(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 h-11 rounded-xl px-3 font-semibold"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Masquer" : "Afficher"}
                </button>
              </div>
            </label>
          </div>
          {erreur && <p className="mt-5 rounded-xl bg-red-50 p-4 font-semibold text-red-700" role="alert">{erreur}</p>}
          <button className="touch-target mt-7 w-full rounded-2xl bg-[#111111] px-6 text-lg font-bold text-white shadow-lg" type="submit">
            Se connecter
          </button>
        </form>
      </section>
    </main>
  );
}
