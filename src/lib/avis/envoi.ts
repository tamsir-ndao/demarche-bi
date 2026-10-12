import type { Avis } from "./avis";

// Le navigateur envoie l'avis à la route /api/feedback et rend « ok », ou la raison de l'échec.

export type CodeErreurEnvoiAvis = "trop_de_demandes" | "reseau" | "indisponible";

export type ResultatEnvoiAvis = { ok: true } | { ok: false; code: CodeErreurEnvoiAvis };

type OptionsEnvoi = {
  /** Remplace `fetch` (tests). */
  fetch?: typeof fetch;
};

/** Envoie l'avis. Ne lève jamais d'erreur. */
export async function envoyerLAvis(avis: Avis, { fetch: appeler = fetch }: OptionsEnvoi = {}): Promise<ResultatEnvoiAvis> {
  let reponse: Response;
  try {
    reponse = await appeler("/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(avis),
    });
  } catch {
    return { ok: false, code: "reseau" };
  }
  if (reponse.ok) return { ok: true };
  return { ok: false, code: reponse.status === 429 ? "trop_de_demandes" : "indisponible" };
}

// Ce que la personne lit quand l'avis ne part pas : tutoiement, phrases courtes, et la suite à donner.
const MESSAGES: Record<CodeErreurEnvoiAvis, string> = {
  trop_de_demandes: "Tu vas un peu vite. Attends une minute, puis réessaie.",
  reseau: "Pas de connexion. Vérifie ton réseau, puis réessaie.",
  indisponible: "Je n’ai pas pu garder ton avis. Réessaie dans un instant.",
};

export function messageDeLErreur(code: CodeErreurEnvoiAvis): string {
  return MESSAGES[code];
}
