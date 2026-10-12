// La voix du téléphone : le navigateur lit la réponse à voix haute (« speechSynthesis »). Rien n'est envoyé à un
// service de Démarche-Bi : c'est le téléphone qui parle, avec ses propres voix. Le texte à lire vient de lecture.ts.

export type VoixTelephone = { name: string; lang: string; localService?: boolean; default?: boolean };

/** Les rappels de la voix, typés « au plus large » pour accepter ceux des vrais événements du navigateur. */
type Rappel<E> = { rappel(evenement: E): void }["rappel"];

/** Ce qu'on demande au téléphone de dire (un `SpeechSynthesisUtterance` dans le navigateur, un faux dans les tests). */
export type PhraseVocale = {
  text: string;
  lang: string;
  voice: VoixTelephone | null;
  rate: number;
  volume: number;
  onend?: Rappel<object> | null;
  onerror?: Rappel<{ error?: string }> | null;
};

/** Ce qu'il faut du `speechSynthesis` du navigateur. */
export type Synthese = {
  speak(phrase: PhraseVocale): void;
  cancel(): void;
  getVoices(): VoixTelephone[];
  speaking?: boolean;
  pending?: boolean;
  addEventListener(type: "voiceschanged", rappel: () => void): void;
  removeEventListener(type: "voiceschanged", rappel: () => void): void;
};

const LANGUE = "fr-FR";

const VOIX_SOIGNEE = /premium|enhanced|natural|neural|online|siri/i;

function estFrancaise(voix: VoixTelephone): boolean {
  return voix.lang.toLowerCase().replace("_", "-").startsWith("fr");
}

/** Plus la note est haute, mieux c'est : le français de France d'abord, puis une voix soignée, puis celle par défaut. */
function note(voix: VoixTelephone): number {
  const france = voix.lang.toLowerCase().replace("_", "-") === "fr-fr" ? 100 : 10;
  return france + (VOIX_SOIGNEE.test(voix.name) ? 20 : 0) + (voix.default ? 3 : 0);
}

/** La meilleure voix française du téléphone, ou rien s'il n'en a pas. À égalité, la première de la liste. */
export function choisirVoix<T extends VoixTelephone>(voix: readonly T[]): T | undefined {
  let meilleure: T | undefined;
  for (const candidate of voix) {
    if (!estFrancaise(candidate)) continue;
    if (meilleure === undefined || note(candidate) > note(meilleure)) meilleure = candidate;
  }
  return meilleure;
}

export type EtatParleur = "indisponible" | "repos" | "lecture";

export type Parleur = {
  /** « indisponible » : le navigateur ne parle pas, ou n'a aucune voix française. */
  etat(): EtatParleur;
  /** Prévient quand l'état change (ou que les voix arrivent) ; rend la fonction qui arrête d'écouter. */
  abonner(rappel: () => void): () => void;
  /** Lit les morceaux l'un après l'autre, en repartant du début si une lecture est en cours. */
  lire(morceaux: string[]): void;
  arreter(): void;
  /**
   * À appeler pendant un geste de la personne (un appui) : l'iPhone n'autorise la voix qu'après un appui,
   * et une phrase muette dite à ce moment-là lui permet de lire la réponse plus tard, quand elle arrive.
   */
  debloquer(): void;
};

type Dependances = {
  /** Le `speechSynthesis` du navigateur, ou rien (serveur, navigateur sans voix). */
  synthese: Synthese | undefined;
  creerPhrase: (texte: string) => PhraseVocale;
};

export function creerParleur({ synthese, creerPhrase }: Dependances): Parleur {
  const abonnes = new Set<() => void>();
  let enLecture = false;
  /** Change à chaque lecture et à chaque arrêt : ce que dit encore l'ancienne lecture ne compte plus. */
  let jeton = 0;

  const prevenir = () => abonnes.forEach((rappel) => rappel());

  function etat(): EtatParleur {
    if (!synthese) return "indisponible";
    const voix = synthese.getVoices();
    // Chrome charge ses voix après coup : une liste vide ne veut pas dire « aucune voix ».
    if (voix.length > 0 && choisirVoix(voix) === undefined) return "indisponible";
    return enLecture ? "lecture" : "repos";
  }

  function abonner(rappel: () => void) {
    abonnes.add(rappel);
    if (abonnes.size === 1) synthese?.addEventListener("voiceschanged", prevenir);
    return () => {
      abonnes.delete(rappel);
      if (abonnes.size === 0) synthese?.removeEventListener("voiceschanged", prevenir);
    };
  }

  function lire(morceaux: string[]) {
    // Sans voix française, un texte français lu par une voix étrangère serait incompréhensible.
    if (!synthese || morceaux.length === 0 || etat() === "indisponible") return;
    // Annuler quand rien ne parle fait perdre la phrase suivante à certains navigateurs : seulement si besoin.
    jeton += 1;
    if (synthese.speaking || synthese.pending) synthese.cancel();
    const monJeton = jeton;
    const voix = choisirVoix(synthese.getVoices()) ?? null;
    enLecture = true;
    prevenir();

    const dire = (index: number) => {
      if (monJeton !== jeton) return;
      if (index >= morceaux.length) {
        enLecture = false;
        prevenir();
        return;
      }
      const phrase = creerPhrase(morceaux[index]);
      phrase.lang = LANGUE;
      phrase.voice = voix;
      phrase.onend = () => dire(index + 1);
      phrase.onerror = () => {
        // Refusée (pas d'appui de la personne) ou en panne : on s'arrête, le bouton « Écouter » reste là.
        if (monJeton !== jeton) return;
        jeton += 1;
        enLecture = false;
        synthese.cancel();
        prevenir();
      };
      synthese.speak(phrase);
    };
    dire(0);
  }

  function arreter() {
    if (!synthese || !enLecture) return;
    jeton += 1;
    enLecture = false;
    synthese.cancel();
    prevenir();
  }

  function debloquer() {
    if (!synthese || etat() === "indisponible") return;
    const phrase = creerPhrase("");
    phrase.lang = LANGUE;
    phrase.volume = 0;
    synthese.speak(phrase);
  }

  return { etat, abonner, lire, arreter, debloquer };
}

let parleurUnique: Parleur | undefined;

/** Le parleur du navigateur (un seul par page : une seule voix à la fois). */
export function parleurDuNavigateur(): Parleur {
  parleurUnique ??= creerParleur({
    synthese: typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : undefined,
    creerPhrase: (texte) => new SpeechSynthesisUtterance(texte),
  });
  return parleurUnique;
}
