import { connection } from "next/server";
import { purgerLeJournal } from "@/lib/avis/serveur";

/**
 * GET /api/cron/purge : appelée chaque nuit par la tâche planifiée de Vercel (vercel.json), avec
 * « Authorization: Bearer <CRON_SECRET> ». Supprime les questions et les avis de plus de 90 jours.
 * 200 { reponses, avis } (nombres supprimés), 401 sans le bon secret, 503 si la base est en panne.
 */
export async function GET(request: Request) {
  // Toujours à la vraie demande : jamais préparée au moment de la construction du site.
  await connection();
  const resultat = await purgerLeJournal(request);
  if (resultat.statut === 200) return Response.json({ reponses: resultat.reponses, avis: resultat.avis });
  return new Response(null, { status: resultat.statut });
}
