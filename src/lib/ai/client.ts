import { getChatProviders, getWhisperConfig, type ChatProvider, type WhisperConfig } from "./config";

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

export type TranscribeOptions = {
  /** Nom du fichier envoyé : son extension indique à Whisper le format de l'audio (audio.webm par défaut). */
  nomFichier?: string;
  /** Délai accordé à Whisper (20 secondes par défaut). */
  timeoutMs?: number;
};

type DependancesTranscription = {
  /** Réglages de Whisper (ceux de l'environnement par défaut) ; `null` : transcription non configurée. */
  config?: WhisperConfig | null;
  /** Remplace `fetch` (tests). */
  fetch?: typeof fetch;
};

const DELAI_TRANSCRIPTION_PAR_DEFAUT_MS = 20_000;

function echecTranscription(motif: string, nature: NatureErreurIA): never {
  throw new ErreurIA(`La transcription a échoué (${motif}).`, nature, [`transcription : ${motif}`]);
}

const motifSelonErreur = (err: unknown, motifParDefaut: string) =>
  err instanceof Error && err.name === "TimeoutError" ? "délai dépassé" : motifParDefaut;

/**
 * Transcrit un enregistrement audio en texte français avec Whisper. Rend le texte sans espaces autour, vide
 * quand rien n'est reconnu. Échoue avec une ErreurIA (non configurée, saturée ou indisponible) qui ne
 * contient ni la clé ni le détail du fournisseur.
 */
export async function transcribe(
  audio: Blob,
  options: TranscribeOptions = {},
  deps: DependancesTranscription = {},
): Promise<string> {
  const config = deps.config === undefined ? getWhisperConfig() : deps.config;
  if (!config) {
    throw new ErreurIA(
      "Transcription non configurée. Renseigne WHISPER_API_KEY dans .env.local (voir docs/SETUP.md).",
      "non_configuree",
    );
  }
  const appeler = deps.fetch ?? fetch;

  const form = new FormData();
  form.append("file", audio, options.nomFichier ?? "audio.webm");
  form.append("model", config.model);
  form.append("language", "fr");

  let res: Response;
  try {
    res = await appeler(`${config.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}` },
      body: form,
      signal: AbortSignal.timeout(options.timeoutMs ?? DELAI_TRANSCRIPTION_PAR_DEFAUT_MS),
    });
  } catch (err) {
    return echecTranscription(motifSelonErreur(err, "erreur réseau"), "indisponible");
  }

  if (!res.ok) {
    void res.body?.cancel().catch(() => undefined);
    return echecTranscription(`HTTP ${res.status}`, res.status === 429 ? "saturee" : "indisponible");
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    return echecTranscription(motifSelonErreur(err, "réponse illisible"), "indisponible");
  }
  const texte = typeof data === "object" && data !== null && "text" in data ? data.text : undefined;
  return typeof texte === "string" ? texte.trim() : "";
}
