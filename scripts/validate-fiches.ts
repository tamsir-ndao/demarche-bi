// Valide toutes les fiches de content/demarches/ (ou du dossier passé en argument).
//   npm run validate:fiches
//   npm run validate:fiches -- chemin/vers/un/dossier
// Code de sortie 1 si une fiche est invalide : utilisé par la CI GitHub.
import path from "node:path";
import { loadFiches } from "../src/lib/fiches/load";
import { estPerimee } from "../src/lib/fiches/schema";

const dirArg = process.argv[2];
const { fiches, errors } = loadFiches(dirArg ? path.resolve(dirArg) : undefined);

const verifiees = fiches.filter((f) => f.statut === "verifie");
const brouillons = fiches.length - verifiees.length;
const perimees = verifiees.filter((f) => estPerimee(f.verifie_le));

console.log(
  `${fiches.length} fiche(s) valide(s) : ${verifiees.length} vérifiée(s), ${brouillons} brouillon(s).`,
);

for (const fiche of perimees) {
  console.warn(`Attention : « ${fiche.slug} » n'a pas été vérifiée depuis plus de 12 mois.`);
}

if (fiches.length === 0 && errors.length === 0) {
  console.warn("Aucune fiche pour l'instant : copie content/demarches/_modele.md pour commencer.");
}

if (errors.length > 0) {
  console.error(`\n${errors.length} problème(s) à corriger :`);
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}
