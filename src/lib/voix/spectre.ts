// Le spectre vocal en direct (les barres qui bougent quand on parle), la détection de voix et le chronomètre.
// Que du calcul sur des tableaux : le navigateur fournit les données de l'analyseur audio (voir enregistreur.ts).

/** Nombre de barres du spectre, comme dans la maquette (impair : une barre au centre). */
export const NOMBRE_DE_BARRES = 27;

/** Une bande de fréquences par barre du demi-spectre : le centre montre les graves, les bords les aigus. */
const NOMBRE_DE_BANDES = Math.ceil(NOMBRE_DE_BARRES / 2);

/** La voix tient entre ces deux fréquences ; au-delà, c'est du souffle ou du bruit. */
const FREQUENCE_MIN_HZ = 100;
const FREQUENCE_MAX_HZ = 4000;

/** Sous ce niveau (de 0 à 255) c'est le bruit de fond : la barre reste à plat. Au-dessus de PLAFOND, elle est pleine. */
const PLANCHER = 70;
const PLAFOND = 200;

type OptionsSpectre = {
  /** Fréquence d'échantillonnage de l'audio, en Hz (celle de l'AudioContext). */
  echantillonnage: number;
  /** Taille de la transformée de l'analyseur (fftSize) : il donne la moitié de cases. */
  tailleFft: number;
};

/**
 * Passe des cases de fréquences de l'analyseur (de 0 à 255, `getByteFrequencyData`) aux hauteurs des barres (de 0 à 1).
 * Les bandes suivent l'oreille (plus fines dans les graves), et le spectre est en miroir autour de la barre centrale :
 * une voix, qui est surtout dans les graves et les médiums, dessine une cloche.
 */
export function hauteursDuSpectre(cases: Uint8Array, { echantillonnage, tailleFft }: OptionsSpectre): number[] {
  const largeurCase = echantillonnage / tailleFft;
  const raison = (FREQUENCE_MAX_HZ / FREQUENCE_MIN_HZ) ** (1 / NOMBRE_DE_BANDES);

  const bandes = Array.from({ length: NOMBRE_DE_BANDES }, (_, bande) => {
    const debut = FREQUENCE_MIN_HZ * raison ** bande;
    const fin = debut * raison;
    // Les cases dont la fréquence tombe dans la bande ; à défaut (bande plus étroite qu'une case), la plus proche.
    let premiere = Math.ceil(debut / largeurCase);
    let derniere = Math.ceil(fin / largeurCase) - 1;
    if (derniere < premiere) premiere = derniere = Math.round(Math.sqrt(debut * fin) / largeurCase);
    let maximum = 0;
    for (let i = premiere; i <= derniere && i < cases.length; i++) maximum = Math.max(maximum, cases[i]);
    return Math.min(1, Math.max(0, (maximum - PLANCHER) / (PLAFOND - PLANCHER)));
  });

  const centre = NOMBRE_DE_BARRES >> 1;
  return Array.from({ length: NOMBRE_DE_BARRES }, (_, barre) => bandes[Math.abs(barre - centre)]);
}

/** Adoucit le mouvement des barres : elles montent vite avec la voix et retombent doucement. */
export function lisser(
  precedent: number[],
  actuel: number[],
  { montee = 0.6, descente = 0.15 }: { montee?: number; descente?: number } = {},
): number[] {
  return actuel.map((valeur, i) => precedent[i] + (valeur - precedent[i]) * (valeur > precedent[i] ? montee : descente));
}

/** La puissance du son, de 0 (silence) à 1 (pleine échelle), à partir des mesures de l'onde (`getByteTimeDomainData`, 128 = silence). */
export function niveauDeVoix(onde: Uint8Array): number {
  if (onde.length === 0) return 0;
  let somme = 0;
  for (const mesure of onde) somme += ((mesure - 128) / 128) ** 2;
  return Math.sqrt(somme / onde.length);
}

/** Un trou plus long entre deux images (onglet en arrière-plan) ne compte pas comme du temps de voix. */
const ECART_MAX_ENTRE_IMAGES_MS = 100;

type OptionsDetecteur = {
  /** Puissance (de 0 à 1) à partir de laquelle on considère qu'il y a du son. */
  seuil: number;
  /** Durée totale de son nécessaire pour dire que quelqu'un a parlé. */
  dureeMinMs: number;
};

/**
 * Dit si quelqu'un a parlé pendant l'enregistrement. Un enregistrement sans voix n'est pas envoyé : Whisper y
 * invente des phrases (voir silence.ts) et chaque envoi use le quota.
 */
export function creerDetecteurDeVoix({ seuil, dureeMinMs }: OptionsDetecteur) {
  let derniereImageMs: number | undefined;
  let dureeDeVoixMs = 0;

  return {
    /** À appeler à chaque image avec la puissance du moment et l'heure (en millisecondes). */
    suivre(niveau: number, maintenantMs: number): void {
      if (derniereImageMs !== undefined && niveau >= seuil) {
        dureeDeVoixMs += Math.min(maintenantMs - derniereImageMs, ECART_MAX_ENTRE_IMAGES_MS);
      }
      derniereImageMs = maintenantMs;
    },
    voixEntendue: () => dureeDeVoixMs >= dureeMinMs,
  };
}

/** Le temps écoulé comme un chronomètre : 0:07, 1:05. */
export function formaterDuree(ms: number): string {
  const secondes = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(secondes / 60)}:${String(secondes % 60).padStart(2, "0")}`;
}
