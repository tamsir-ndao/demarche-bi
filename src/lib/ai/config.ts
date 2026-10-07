export type ChatProvider = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type WhisperConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

const GROQ_URL = "https://api.groq.com/openai/v1";
const OPENROUTER_URL = "https://openrouter.ai/api/v1";

/**
 * Fournisseurs de chat dans l'ordre d'essai : Groq d'abord, OpenRouter en secours.
 * Un fournisseur sans clé API est ignoré.
 */
export function getChatProviders(): ChatProvider[] {
  const providers: ChatProvider[] = [];

  const primaryKey = process.env.AI_API_KEY;
  if (primaryKey) {
    providers.push({
      name: "principal",
      baseUrl: process.env.AI_BASE_URL || GROQ_URL,
      apiKey: primaryKey,
      model: process.env.AI_MODEL || "llama-3.3-70b-versatile",
    });
  }

  const fallbackKey = process.env.AI_FALLBACK_API_KEY;
  if (fallbackKey) {
    providers.push({
      name: "secours",
      baseUrl: process.env.AI_FALLBACK_BASE_URL || OPENROUTER_URL,
      apiKey: fallbackKey,
      model:
        process.env.AI_FALLBACK_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
    });
  }

  return providers;
}

export function getWhisperConfig(): WhisperConfig | null {
  const apiKey = process.env.WHISPER_API_KEY;
  if (!apiKey) return null;
  return {
    baseUrl: process.env.WHISPER_BASE_URL || GROQ_URL,
    apiKey,
    model: process.env.WHISPER_MODEL || "whisper-large-v3-turbo",
  };
}
