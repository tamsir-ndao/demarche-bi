export type ChatProvider = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** Effort de raisonnement demandé au modèle (gpt-oss : « low » ; Qwen : « none »). Absent : rien n'est envoyé. */
  reasoningEffort?: string;
};

export type WhisperConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

type Env = Record<string, string | undefined>;

const GROQ_URL = "https://api.groq.com/openai/v1";
const OPENROUTER_URL = "https://openrouter.ai/api/v1";

/**
 * Modèles open-weight de Groq (testés les 11 et 13 octobre 2026). Chacun a son propre quota journalier : quand l'un est
 * épuisé, le suivant prend le relais. Le plus petit est le dernier recours.
 */
export const MODELE_PRINCIPAL = "openai/gpt-oss-120b";
export const MODELE_SECOURS = "qwen/qwen3.8-27b";
export const MODELE_TROISIEME = "openai/gpt-oss-20b";

/** Effort de raisonnement du modèle par défaut de chaque rôle : une réponse courte, vite, sans longue réflexion. */
const EFFORT_PRINCIPAL = "low";
const EFFORT_SECOURS = "none";
const EFFORT_TROISIEME = "low";

/**
 * Fournisseurs de chat dans l'ordre d'essai. Un fournisseur sans clé API est ignoré.
 * - principal : AI_API_KEY (Groq par défaut) ;
 * - secours : un fournisseur explicite (AI_FALLBACK_API_KEY et AI_FALLBACK_MODEL, OpenRouter par défaut) ou,
 *   quand le principal est Groq, un second modèle de Groq avec la même clé ;
 * - troisième (Groq seulement, sans fournisseur de secours explicite) : un troisième modèle de Groq, avec la même clé.
 */
export function getChatProviders(env: Env = process.env): ChatProvider[] {
  const providers: ChatProvider[] = [];

  const primaryKey = env.AI_API_KEY;
  if (!primaryKey) return providers;

  const baseUrl = env.AI_BASE_URL || GROQ_URL;
  const model = env.AI_MODEL || MODELE_PRINCIPAL;
  providers.push({
    name: "principal",
    baseUrl,
    apiKey: primaryKey,
    model,
    reasoningEffort: env.AI_REASONING_EFFORT || (model === MODELE_PRINCIPAL ? EFFORT_PRINCIPAL : undefined),
  });

  const fallbackKey = env.AI_FALLBACK_API_KEY;
  const fallbackModel = env.AI_FALLBACK_MODEL;
  if (fallbackKey) {
    // Fournisseur explicite : le modèle est obligatoire (les noms de modèles gratuits changent trop souvent pour un défaut).
    if (fallbackModel) {
      providers.push({
        name: "secours",
        baseUrl: env.AI_FALLBACK_BASE_URL || OPENROUTER_URL,
        apiKey: fallbackKey,
        model: fallbackModel,
        reasoningEffort: undefined,
      });
    }
  } else if (baseUrl === GROQ_URL) {
    const modeleSecours = fallbackModel || MODELE_SECOURS;
    providers.push({
      name: "secours",
      baseUrl,
      apiKey: primaryKey,
      model: modeleSecours,
      reasoningEffort: modeleSecours === MODELE_SECOURS ? EFFORT_SECOURS : undefined,
    });
    if (!providers.some((fournisseur) => fournisseur.model === MODELE_TROISIEME)) {
      providers.push({ name: "troisieme", baseUrl, apiKey: primaryKey, model: MODELE_TROISIEME, reasoningEffort: EFFORT_TROISIEME });
    }
  }

  return providers;
}

export function getWhisperConfig(env: Env = process.env): WhisperConfig | null {
  const apiKey = env.WHISPER_API_KEY;
  if (!apiKey) return null;
  return {
    baseUrl: env.WHISPER_BASE_URL || GROQ_URL,
    apiKey,
    model: env.WHISPER_MODEL || "whisper-large-v3-turbo",
  };
}
