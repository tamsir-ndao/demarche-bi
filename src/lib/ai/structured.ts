import { z } from "zod";
import { chat, ErreurIA, type ChatMessage } from "./client";
import type { ChatProvider } from "./config";

/** Un appel au modèle dont la réponse doit être un objet conforme à `schema`. */
export type AppelStructure<T> = {
  /** Nom du schéma envoyé au fournisseur. */
  nom: string;
  schema: z.ZodType<T>;
  messages: ChatMessage[];
  /** Plafond de la réponse, en tokens. */
  maxTokens: number;
  timeoutMs?: number;
};

/** Ce dont les étapes « comprendre » et « répondre » ont besoin : poser une question, recevoir un objet validé. */
export type Modele = <T>(appel: AppelStructure<T>) => Promise<T>;

type Dependances = { providers?: ChatProvider[]; fetch?: typeof fetch };

function lire<T>(schema: z.ZodType<T>, texte: string): T | null {
  try {
    const resultat = schema.safeParse(JSON.parse(texte));
    return resultat.success ? resultat.data : null;
  } catch {
    return null;
  }
}

/**
 * Appelle le modèle avec le schéma de l'objet attendu (mode strict) et valide la réponse avec Zod.
 * Une réponse qui ne respecte pas le schéma est refusée : le fournisseur suivant est essayé (voir `chat`).
 */
export async function chatJson<T>(appel: AppelStructure<T>, deps: Dependances = {}): Promise<T> {
  const schemaJson: Record<string, unknown> = { ...z.toJSONSchema(appel.schema) };
  delete schemaJson.$schema;

  const texte = await chat(
    appel.messages,
    {
      schema: { nom: appel.nom, schema: schemaJson },
      maxTokens: appel.maxTokens,
      timeoutMs: appel.timeoutMs,
      accepter: (reponse) => lire(appel.schema, reponse) !== null,
    },
    deps,
  );
  const valeur = lire(appel.schema, texte);
  // `accepter` a déjà validé cette réponse : ce cas ne devrait pas arriver.
  if (valeur === null) throw new ErreurIA("Réponse du modèle illisible.", "indisponible");
  return valeur;
}

/** Le modèle configuré dans l'environnement (Groq par défaut). */
export const modeleParDefaut: Modele = (appel) => chatJson(appel);
