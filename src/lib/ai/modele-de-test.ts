// Faux modèle pour les tests de src/lib/ai : il rend des réponses prévues, vérifiées avec le vrai schéma, et note
// chaque appel. Ce fichier ne sert qu'aux tests ; il ne doit jamais être importé par le code de l'application.
import type { AppelStructure, Modele } from "./structured";

/**
 * Renvoie le modèle fictif et la liste de ses appels. Chaque appel consomme la réponse suivante ;
 * une réponse `Error` est levée à la place. La dernière réponse sert pour tous les appels suivants.
 */
export function modeleDeTest(...reponses: unknown[]) {
  const appels: AppelStructure<unknown>[] = [];
  const modele: Modele = async (appel) => {
    appels.push(appel);
    const brute = reponses.length > 1 ? reponses.shift() : reponses[0];
    if (brute instanceof Error) throw brute;
    return appel.schema.parse(brute);
  };
  return { modele, appels };
}
