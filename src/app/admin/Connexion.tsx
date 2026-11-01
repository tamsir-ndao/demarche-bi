"use client";

import { useActionState } from "react";
import { connexion } from "./actions";

export function Connexion() {
  const [erreur, action, enCours] = useActionState(connexion, null);
  return (
    <form action={action} className="mx-auto mt-16 flex w-full max-w-[360px] flex-col gap-3">
      <h1 className="text-[28px] leading-[34px] font-bold tracking-[-0.01em]">Administration</h1>
      <label htmlFor="motDePasse" className="mt-2 text-[15px] leading-5 font-semibold">
        Mot de passe
      </label>
      <input
        id="motDePasse"
        name="motDePasse"
        type="password"
        required
        autoComplete="current-password"
        aria-describedby="erreur-connexion"
        className="min-h-12 rounded-2xl border border-line bg-card px-4 text-[16px]"
      />
      <p id="erreur-connexion" role="status" className="min-h-5 text-[14px] leading-5 text-ink-2">
        {erreur}
      </p>
      <button type="submit" disabled={enCours} className="press min-h-12 rounded-full bg-brand text-[16px] leading-5 font-bold text-on-brand disabled:opacity-60">
        {enCours ? "Vérification…" : "Entrer"}
      </button>
    </form>
  );
}
