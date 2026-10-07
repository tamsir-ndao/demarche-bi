import { getChatProviders, getWhisperConfig } from "./config";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatOptions = {
  /** Demande une sortie JSON valide au modèle. */
  json?: boolean;
  temperature?: number;
};

type ChatResponse = {
  choices?: { message?: { content?: string | null } }[];
};

/**
 * Appelle le modèle de chat. Essaie chaque fournisseur configuré dans l'ordre
 * (Groq, puis OpenRouter) et passe au suivant en cas d'erreur.
 * Retourne le texte brut de la réponse. La validation (Zod) se fait côté appelant.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
): Promise<string> {
  const providers = getChatProviders();
  if (providers.length === 0) {
    throw new Error(
      "Aucun fournisseur IA configuré. Renseigne AI_API_KEY dans .env.local (voir docs/SETUP.md).",
    );
  }

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature: options.temperature ?? 0,
          ...(options.json
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
      });

      if (!res.ok) {
        errors.push(`${provider.name}: HTTP ${res.status}`);
        continue;
      }

      const data = (await res.json()) as ChatResponse;
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
      errors.push(`${provider.name}: réponse vide`);
    } catch (err) {
      errors.push(
        `${provider.name}: ${err instanceof Error ? err.message : "erreur réseau"}`,
      );
    }
  }

  throw new Error(`Tous les fournisseurs IA ont échoué (${errors.join(" ; ")}).`);
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
