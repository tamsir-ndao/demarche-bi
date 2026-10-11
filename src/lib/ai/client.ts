import { getChatProviders, getWhisperConfig, type ChatProvider } from "./config";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Schéma JSON d'une sortie structurée, avec le nom que le fournisseur lui donne. */
export type SchemaJson = { nom: string; schema: Record<string, unknown> };

export type ChatOptions = {
  /** Demande une sortie JSON valide au modèle, sans schéma. */
  json?: boolean;
  /** Demande une sortie conforme à ce schéma (mode strict). Prioritaire sur `json`. */
  schema?: SchemaJson;
  temperature?: number;
  /** Plafond de la réponse, en tokens. */
  maxTokens?: number;
  /** Délai accordé à chaque fournisseur (10 secondes par défaut). */
  timeoutMs?: number;
  /** Refuse une réponse reçue (JSON invalide, par exemple) : on essaie alors le fournisseur suivant. */
  accepter?: (texte: string) => boolean;
};

type ChatResponse = {
  choices?: { message?: { content?: string | null } }[];
};

/** Pourquoi l'IA n'a pas répondu : pas configurée, trop sollicitée (429 partout) ou en panne. */
export type NatureErreurIA = "non_configuree" | "saturee" | "indisponible";

export class ErreurIA extends Error {
  readonly nature: NatureErreurIA;
  /** Un court motif par essai (« principal : HTTP 429 »), sans clé ni détail du fournisseur. */
  readonly details: string[];

  constructor(message: string, nature: NatureErreurIA, details: string[] = []) {
    super(message);
    this.name = "ErreurIA";
    this.nature = nature;
    this.details = details;
  }
}

const DELAI_PAR_DEFAUT_MS = 10_000;

type Dependances = {
  /** Fournisseurs à essayer, dans l'ordre (ceux de l'environnement par défaut). */
  providers?: ChatProvider[];
  /** Remplace `fetch` (tests). */
  fetch?: typeof fetch;
};

function corpsDeLaRequete(provider: ChatProvider, messages: ChatMessage[], options: ChatOptions) {
  return {
    model: provider.model,
    messages,
    temperature: options.temperature ?? 0,
    ...(options.maxTokens ? { max_completion_tokens: options.maxTokens } : {}),
    ...(provider.reasoningEffort ? { reasoning_effort: provider.reasoningEffort } : {}),
    ...(options.schema
      ? {
          response_format: {
            type: "json_schema",
            json_schema: { name: options.schema.nom, strict: true, schema: options.schema.schema },
          },
        }
      : options.json
        ? { response_format: { type: "json_object" } }
        : {}),
  };
}

/**
 * Appelle le modèle de chat. Essaie chaque fournisseur configuré dans l'ordre (par défaut deux modèles de
 * Groq) et passe au suivant en cas d'erreur, de saturation (429), de délai dépassé ou de réponse refusée.
 * Retourne le texte brut de la réponse. La validation (Zod) se fait côté appelant.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
  deps: Dependances = {},
): Promise<string> {
  const providers = deps.providers ?? getChatProviders();
  const appeler = deps.fetch ?? fetch;
  if (providers.length === 0) {
    throw new ErreurIA(
      "Aucun fournisseur IA configuré. Renseigne AI_API_KEY dans .env.local (voir docs/SETUP.md).",
      "non_configuree",
    );
  }

  const details: string[] = [];
  let satures = 0;

  for (const provider of providers) {
    try {
      const res = await appeler(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify(corpsDeLaRequete(provider, messages, options)),
        signal: AbortSignal.timeout(options.timeoutMs ?? DELAI_PAR_DEFAUT_MS),
      });

      if (!res.ok) {
        void res.body?.cancel().catch(() => undefined);
        details.push(`${provider.name} : HTTP ${res.status}`);
        if (res.status === 429) satures += 1;
        continue;
      }

      const data = (await res.json()) as ChatResponse;
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        details.push(`${provider.name} : réponse vide`);
      } else if (options.accepter && !options.accepter(content)) {
        details.push(`${provider.name} : réponse refusée`);
      } else {
        return content;
      }
    } catch (err) {
      const delaiDepasse = err instanceof Error && err.name === "TimeoutError";
      details.push(`${provider.name} : ${delaiDepasse ? "délai dépassé" : "erreur réseau"}`);
    }
  }

  throw new ErreurIA(
    `Tous les fournisseurs IA ont échoué (${details.join(" ; ")}).`,
    satures === providers.length ? "saturee" : "indisponible",
    details,
  );
}

/** Transcrit un enregistrement audio en texte français avec Whisper. */
export async function transcribe(audio: Blob, filename = "audio.webm") {
  const config = getWhisperConfig();
  if (!config) {
    throw new Error(
      "Transcription non configurée. Renseigne WHISPER_API_KEY dans .env.local (voir docs/SETUP.md).",
    );
  }

  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", config.model);
  form.append("language", "fr");

  const res = await fetch(`${config.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: form,
  });

  if (!res.ok) {
    throw new Error(`Échec de la transcription (HTTP ${res.status}).`);
  }

  const data = (await res.json()) as { text?: string };
  return data.text ?? "";
}
