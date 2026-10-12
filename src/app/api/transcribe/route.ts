import { transcrireLaDemande } from "@/lib/ai/serveur";

/**
 * POST /api/transcribe : un formulaire dont le champ « audio » est l'enregistrement de la voix
 * → { "texte": "…" } (texte vide quand rien n'a été entendu), ou { "erreur": "code" } avec le statut HTTP qui va avec
 * (voir docs/ARCHITECTURE.md). L'enregistrement n'est jamais gardé : il est transmis à Whisper (Groq) puis oublié.
 */
export async function POST(request: Request) {
  const resultat = await transcrireLaDemande(request);
  return resultat.ok
    ? Response.json({ texte: resultat.texte })
    : Response.json({ erreur: resultat.code }, { status: resultat.statut });
}
