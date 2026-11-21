"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [erreur, setErreur] = useState("");

  async function quitter() {
    if (leaving) return;
    setLeaving(true);
    setErreur("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("La fermeture de session a échoué.");
      router.replace("/");
      router.refresh();
    } catch {
      setErreur("Impossible de fermer la session. Réessayez.");
    } finally {
      setLeaving(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={quitter} disabled={leaving} className="touch-target flex items-center rounded-xl border px-4 font-semibold disabled:opacity-50">
        {leaving ? "Fermeture…" : "Quitter"}
      </button>
      {erreur && <p role="alert" className="absolute right-4 top-full z-10 mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-800 shadow">{erreur}</p>}
    </div>
  );
}
