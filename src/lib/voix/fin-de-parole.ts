// La conversation s'arrête d'écouter toute seule : après la parole, un silence assez long veut dire que la personne a fini.

/** Rend un suivi du son : `suivre` dit vrai quand la personne a parlé puis s'est tue assez longtemps. */
export function creerDetecteurFinDeParole({ seuil, silenceMs }: { seuil: number; silenceMs: number }) {
  let derniereVoixMs: number | undefined;
  return {
    suivre(niveau: number, maintenantMs: number): boolean {
      if (niveau >= seuil) derniereVoixMs = maintenantMs;
      return derniereVoixMs !== undefined && maintenantMs - derniereVoixMs >= silenceMs;
    },
  };
}
