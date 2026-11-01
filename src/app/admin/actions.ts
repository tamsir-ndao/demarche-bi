"use server";

import { cookies, headers } from "next/headers";
import { creerLimiteur } from "@/lib/ai/cache";
import { visiteurDepuis } from "@/lib/ai/service";
import { COOKIE_ADMIN, creerJeton, DUREE_SESSION_S, motDePasseValide } from "@/lib/admin/session";

const limiteur = creerLimiteur({ max: 5, fenetreMs: 60_000 });

export async function connexion(_avant: string | null, donnees: FormData): Promise<string | null> {
  const visiteur = visiteurDepuis(await headers());
  if (visiteur !== undefined && !limiteur.autoriser(visiteur)) return "Trop d’essais. Réessaie dans une minute.";

  const secret = process.env.ADMIN_PASSWORD;
  const saisi = donnees.get("motDePasse");
  if (typeof saisi !== "string" || !secret || !motDePasseValide(saisi, secret)) return "Mot de passe incorrect.";

  (await cookies()).set(COOKIE_ADMIN, creerJeton(secret, Date.now()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: DUREE_SESSION_S,
  });
  return null;
}

export async function deconnexion(): Promise<void> {
  (await cookies()).delete({ name: COOKIE_ADMIN, path: "/admin" });
}
