import { estCodeServeur, type CodeErreurVoix } from "./codes";

// Le navigateur envoie l'enregistrement à la route /api/transcribe et rend le texte, ou la raison de l'échec.

export type ResultatEnvoi =
  | { ok: true; texte: string }
  // « annule » : la personne a fermé l'écran avant la réponse, ce n'est pas une erreur à montrer.
  | { ok: false; code: CodeErreurVoix | "annule" };

type OptionsEnvoi = {
  /** Remplace `fetch` (tests). */
  fetch?: typeof fetch;
  signal?: AbortSignal;
};

function champ(donnees: unknown, nom: string): unknown {
  return typeof donnees === "object" && donnees !== null ? (donnees as Record<string, unknown>)[nom] : undefined;
}

/** Envoie l'enregistrement et rend le texte (vide quand rien n'a été entendu). Ne lève jamais d'erreur. */
export async function envoyerLaVoix(audio: Blob, { fetch: appeler = fetch, signal }: OptionsEnvoi = {}): Promise<ResultatEnvoi> {
  const formulaire = new FormData();
  formulaire.append("audio", audio, "enregistrement");

  let reponse: Response;
  try {
    reponse = await appeler("/api/transcribe", { method: "POST", body: formulaire, signal });
  } catch (erreur) {
    const annule = signal?.aborted || (typeof erreur === "object" && erreur !== null && "name" in erreur && erreur.name === "AbortError");
    return { ok: false, code: annule ? "annule" : "reseau" };
  }

  const donnees: unknown = await reponse.json().catch(() => undefined);
  if (signal?.aborted) return { ok: false, code: "annule" };

  if (!reponse.ok) {
    const code = champ(donnees, "erreur");
    return { ok: false, code: estCodeServeur(code) ? code : "service_indisponible" };
  }
  const texte = champ(donnees, "texte");
  return typeof texte === "string" ? { ok: true, texte } : { ok: false, code: "service_indisponible" };
}
