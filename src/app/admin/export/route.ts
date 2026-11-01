import { enCsv, lireExport } from "@/lib/admin/donnees";
import { estConnecte, requeteAdmin } from "@/lib/admin/serveur";

/** GET /admin/export : les totaux par jour en CSV, réservés à l'administrateur. */
export async function GET() {
  if (!(await estConnecte())) return new Response(null, { status: 401 });
  const requete = requeteAdmin();
  if (!requete) return new Response(null, { status: 503 });
  try {
    return new Response(enCsv(await lireExport(requete, Date.now())), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="demarche-bi-usage.csv"', "Cache-Control": "no-store" },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
