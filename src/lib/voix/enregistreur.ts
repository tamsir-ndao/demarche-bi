import { DUREE_MAX_ENREGISTREMENT_S } from "./audio";
import type { CodeErreurVoix } from "./codes";
import { creerDetecteurDeVoix, hauteursDuSpectre, lisser, niveauDeVoix, NOMBRE_DE_BARRES } from "./spectre";

// L'enregistrement de la voix dans le navigateur : micro, enregistreur, spectre en direct.
// À n'appeler que depuis un composant client. Rien n'est gardé : le son reste en mémoire jusqu'à l'envoi.

/** Du plus léger au plus répandu : webm/opus (Chrome, Firefox), ogg/opus, mp4 (Safari). Whisper lit les trois. */
const FORMATS = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

export function choisirFormat(estPris: (type: string) => boolean): string | undefined {
  return FORMATS.find(estPris);
}

export type CodeErreurMicro = Extract<CodeErreurVoix, "micro_refuse" | "micro_introuvable" | "micro_inaccessible">;

/** Traduit l'erreur du navigateur quand le micro ne s'ouvre pas. */
export function codeErreurMicro(erreur: unknown): CodeErreurMicro {
  const nom = erreur instanceof Error ? erreur.name : "";
  if (nom === "NotAllowedError" || nom === "SecurityError") return "micro_refuse";
  if (nom === "NotFoundError" || nom === "OverconstrainedError") return "micro_introuvable";
  return "micro_inaccessible";
}

/** Le navigateur peut-il enregistrer ? Non sur une page non sécurisée (ni https ni localhost) ou dans un très vieux navigateur. */
export function voixDisponible(navigateur: { mediaDevices?: { getUserMedia?: unknown }; MediaRecorder?: unknown }): boolean {
  return typeof navigateur.mediaDevices?.getUserMedia === "function" && typeof navigateur.MediaRecorder === "function";
}

/** Pourquoi l'enregistrement n'a pas démarré. */
export class ErreurMicro extends Error {
  readonly code: CodeErreurMicro | "voix_indisponible";

  constructor(code: CodeErreurMicro | "voix_indisponible") {
    super(code);
    this.name = "ErreurMicro";
    this.code = code;
  }
}

export type Enregistrement = {
  audio: Blob;
  dureeMs: number;
  /** Faux quand personne n'a parlé : on n'envoie pas un enregistrement vide (voir silence.ts). */
  voixEntendue: boolean;
};

export type Enregistreur = {
  /** Arrête l'enregistrement, libère le micro et rend ce qui a été enregistré. */
  terminer(): Promise<Enregistrement>;
  /** Abandonne : le micro est libéré, rien n'est gardé. */
  annuler(): void;
};

type OptionsEnregistreur = {
  /** Appelé à chaque image avec la hauteur de chaque barre du spectre (de 0 à 1). */
  surSpectre: (hauteurs: number[]) => void;
  /** Appelé quand la durée maximale est atteinte : l'appelant termine alors l'enregistrement. */
  surDureeMax: () => void;
};

/** 32 kbit/s suffisent pour la voix (Whisper la ramène à 16 kHz) : 30 secondes pèsent 120 ko, utile avec un forfait data limité. */
const DEBIT_AUDIO = 32_000;
const TAILLE_FFT = 2048;
/** Puissance (de 0 à 1) à partir de laquelle on entend du son, et durée de son nécessaire pour dire que quelqu'un a parlé. */
const SEUIL_DE_VOIX = 0.02;
const DUREE_MIN_DE_VOIX_MS = 300;

/**
 * Ouvre le micro (le navigateur demande l'autorisation) et démarre l'enregistrement.
 * À appeler directement dans le geste de la personne (un appui) : Safari n'autorise le son qu'à ce moment-là.
 * Lève une ErreurMicro quand le micro n'est pas utilisable.
 */
export async function demarrerEnregistrement({ surSpectre, surDureeMax }: OptionsEnregistreur): Promise<Enregistreur> {
  if (!voixDisponible({ mediaDevices: navigator.mediaDevices, MediaRecorder: window.MediaRecorder })) {
    throw new ErreurMicro("voix_indisponible");
  }

  let contexte: AudioContext;
  try {
    // Créé avant d'attendre l'autorisation, pendant le geste de la personne ; sinon Safari le laisse en pause.
    contexte = new AudioContext();
  } catch {
    throw new ErreurMicro("voix_indisponible");
  }
  void contexte.resume().catch(() => undefined);

  let flux: MediaStream;
  try {
    flux = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (erreur) {
    void contexte.close().catch(() => undefined);
    throw new ErreurMicro(codeErreurMicro(erreur));
  }

  const libererLeMicro = () => {
    flux.getTracks().forEach((piste) => piste.stop());
    void contexte.close().catch(() => undefined);
  };

  let analyseur: AnalyserNode;
  let enregistreur: MediaRecorder;
  const format = choisirFormat((type) => MediaRecorder.isTypeSupported(type));
  try {
    analyseur = contexte.createAnalyser();
    analyseur.fftSize = TAILLE_FFT;
    analyseur.smoothingTimeConstant = 0.4;
    // Le micro n'est pas relié aux haut-parleurs : seulement à l'analyseur.
    contexte.createMediaStreamSource(flux).connect(analyseur);
    enregistreur = new MediaRecorder(flux, { ...(format ? { mimeType: format } : {}), audioBitsPerSecond: DEBIT_AUDIO });
  } catch {
    // Le micro est déjà ouvert : on le referme avant de dire que la voix ne marche pas ici.
    libererLeMicro();
    throw new ErreurMicro("voix_indisponible");
  }

  const morceaux: Blob[] = [];
  enregistreur.addEventListener("dataavailable", (evenement) => {
    if (evenement.data.size > 0) morceaux.push(evenement.data);
  });

  const cases = new Uint8Array(analyseur.frequencyBinCount);
  const onde = new Uint8Array(analyseur.fftSize);
  const detecteur = creerDetecteurDeVoix({ seuil: SEUIL_DE_VOIX, dureeMinMs: DUREE_MIN_DE_VOIX_MS });
  let hauteurs: number[] = new Array<number>(NOMBRE_DE_BARRES).fill(0);
  let image = 0;

  const dessiner = (maintenantMs: number) => {
    analyseur.getByteFrequencyData(cases);
    analyseur.getByteTimeDomainData(onde);
    hauteurs = lisser(hauteurs, hauteursDuSpectre(cases, { echantillonnage: contexte.sampleRate, tailleFft: TAILLE_FFT }));
    detecteur.suivre(niveauDeVoix(onde), maintenantMs);
    surSpectre(hauteurs);
    image = requestAnimationFrame(dessiner);
  };

  const debutMs = performance.now();
  enregistreur.start();
  image = requestAnimationFrame(dessiner);
  const minuteur = setTimeout(surDureeMax, DUREE_MAX_ENREGISTREMENT_S * 1000);

  // Libère le micro (le voyant du navigateur s'éteint), l'analyse et le minuteur.
  const liberer = () => {
    cancelAnimationFrame(image);
    clearTimeout(minuteur);
    libererLeMicro();
  };

  return {
    terminer: () =>
      new Promise<Enregistrement>((resoudre) => {
        const finir = () => {
          // Si l'analyse n'a pas tourné (audio resté en pause), on ne peut pas dire que personne n'a parlé.
          const analyseFiable = contexte.state === "running";
          liberer();
          resoudre({
            audio: new Blob(morceaux, { type: enregistreur.mimeType || format || "audio/webm" }),
            dureeMs: performance.now() - debutMs,
            voixEntendue: !analyseFiable || detecteur.voixEntendue(),
          });
        };
        if (enregistreur.state === "inactive") {
          finir();
          return;
        }
        enregistreur.addEventListener("stop", finir, { once: true });
        enregistreur.stop();
      }),
    annuler: () => {
      if (enregistreur.state !== "inactive") enregistreur.stop();
      liberer();
    },
  };
}
