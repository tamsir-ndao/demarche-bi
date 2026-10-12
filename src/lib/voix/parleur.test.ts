// Tests du parleur : la voix du téléphone, pilotée par un faux « speechSynthesis ». Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { choisirVoix, creerParleur, type PhraseVocale, type Synthese, type VoixTelephone } from "./parleur";

const voix = (name: string, lang: string, extra: Partial<VoixTelephone> = {}): VoixTelephone => ({ name, lang, ...extra });

describe("choisirVoix", () => {
  it("ne prend que des voix françaises", () => {
    assert.equal(choisirVoix([voix("Samantha", "en-US"), voix("Laila", "ar-SA")]), undefined);
    assert.equal(choisirVoix([]), undefined);
  });
  it("préfère le français de France aux autres français", () => {
    const choix = choisirVoix([voix("Nicolas", "fr-CA"), voix("Thomas", "fr-FR"), voix("Jacques", "fr-BE")]);
    assert.equal(choix?.name, "Thomas");
  });
  it("lit aussi « fr_FR » (Android écrit parfois le tiret du bas) et les majuscules", () => {
    assert.equal(choisirVoix([voix("Google français", "fr_FR")])?.name, "Google français");
    assert.equal(choisirVoix([voix("x", "FR-fr")])?.name, "x");
  });
  it("compte « fr_FR » comme le français de France", () => {
    assert.equal(choisirVoix([voix("Nicolas", "fr-CA"), voix("Google français", "fr_FR")])?.name, "Google français");
  });
  it("préfère une voix améliorée à une voix de base du même français", () => {
    const choix = choisirVoix([voix("Thomas", "fr-FR"), voix("Amélie (Enhanced)", "fr-FR"), voix("Audrey", "fr-FR")]);
    assert.equal(choix?.name, "Amélie (Enhanced)");
    assert.equal(choisirVoix([voix("Thomas", "fr-FR"), voix("Voix Premium", "fr-FR")])?.name, "Voix Premium");
  });
  it("préfère la voix par défaut du téléphone quand rien d'autre ne les distingue", () => {
    const choix = choisirVoix([voix("A", "fr-FR"), voix("B", "fr-FR", { default: true })]);
    assert.equal(choix?.name, "B");
  });
  it("garde la première en cas d'égalité", () => {
    assert.equal(choisirVoix([voix("A", "fr-FR"), voix("B", "fr-FR")])?.name, "A");
  });
  it("le pays compte plus que la qualité de la voix", () => {
    const choix = choisirVoix([voix("Chantal (Enhanced)", "fr-CA"), voix("Thomas", "fr-FR")]);
    assert.equal(choix?.name, "Thomas");
  });
});

type Evenement = { error?: string };

class FausseSynthese implements Synthese {
  voix: VoixTelephone[] = [voix("Thomas", "fr-FR")];
  dites: PhraseVocale[] = [];
  annulations = 0;
  speaking = false;
  pending = false;
  ecouteurs = new Set<() => void>();
  getVoices() {
    return this.voix;
  }
  speak(phrase: PhraseVocale) {
    this.dites.push(phrase);
    this.speaking = true;
  }
  cancel() {
    this.annulations += 1;
    this.speaking = false;
  }
  addEventListener(_type: "voiceschanged", rappel: () => void) {
    this.ecouteurs.add(rappel);
  }
  removeEventListener(_type: "voiceschanged", rappel: () => void) {
    this.ecouteurs.delete(rappel);
  }
  /** Le téléphone a fini de dire la dernière phrase. */
  finir(index = this.dites.length - 1) {
    this.dites[index].onend?.({});
  }
  echouer(erreur: string, index = this.dites.length - 1) {
    (this.dites[index].onerror as ((e: Evenement) => void) | undefined)?.({ error: erreur });
  }
}

const creerPhrase = (text: string): PhraseVocale => ({ text, lang: "", voice: null, rate: 1, volume: 1 });
function parleurAvec(synthese: FausseSynthese | undefined) {
  return creerParleur({ synthese, creerPhrase });
}

describe("état du parleur", () => {
  it("est indisponible quand le navigateur ne sait pas parler", () => {
    assert.equal(parleurAvec(undefined).etat(), "indisponible");
  });
  it("est indisponible quand les voix sont chargées et qu'aucune n'est française", () => {
    const synthese = new FausseSynthese();
    synthese.voix = [voix("Samantha", "en-US")];
    assert.equal(parleurAvec(synthese).etat(), "indisponible");
  });
  it("est au repos tant que les voix ne sont pas chargées (Chrome les charge après coup)", () => {
    const synthese = new FausseSynthese();
    synthese.voix = [];
    assert.equal(parleurAvec(synthese).etat(), "repos");
  });
  it("est au repos avec une voix française", () => {
    assert.equal(parleurAvec(new FausseSynthese()).etat(), "repos");
  });
  it("prévient quand les voix arrivent, et seulement tant qu'on écoute", () => {
    const synthese = new FausseSynthese();
    synthese.voix = [];
    const parleur = parleurAvec(synthese);
    let appels = 0;
    const arreter = parleur.abonner(() => (appels += 1));
    synthese.voix = [voix("Samantha", "en-US")];
    synthese.ecouteurs.forEach((rappel) => rappel());
    assert.equal(appels, 1);
    assert.equal(parleur.etat(), "indisponible");
    arreter();
    assert.equal(synthese.ecouteurs.size, 0);
  });
});

describe("lire", () => {
  it("dit le premier morceau en français avec la voix choisie, puis le suivant quand le premier est fini", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    parleur.lire(["Un.", "Deux.", "Trois."]);
    assert.equal(parleur.etat(), "lecture");
    assert.equal(synthese.dites.length, 1);
    assert.equal(synthese.dites[0].text, "Un.");
    assert.equal(synthese.dites[0].lang, "fr-FR");
    assert.equal(synthese.dites[0].voice?.name, "Thomas");
    synthese.finir();
    assert.equal(synthese.dites.length, 2);
    assert.equal(synthese.dites[1].text, "Deux.");
    synthese.finir();
    assert.equal(synthese.dites[2].text, "Trois.");
    assert.equal(parleur.etat(), "lecture");
    synthese.finir();
    assert.equal(parleur.etat(), "repos");
    assert.equal(synthese.dites.length, 3);
  });
  it("prévient les abonnés au début et à la fin", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    let appels = 0;
    parleur.abonner(() => (appels += 1));
    parleur.lire(["Un."]);
    assert.equal(appels, 1);
    synthese.finir();
    assert.equal(appels, 2);
  });
  it("ne fait rien sans morceau : ni voix, ni annulation, ni avis aux abonnés", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    let appels = 0;
    parleur.abonner(() => (appels += 1));
    parleur.lire([]);
    assert.equal(synthese.dites.length, 0);
    assert.equal(synthese.annulations, 0);
    assert.equal(appels, 0);
    assert.equal(parleur.etat(), "repos");
  });
  it("ne fait rien quand le navigateur ne sait pas parler", () => {
    const parleur = parleurAvec(undefined);
    parleur.lire(["Un."]);
    assert.equal(parleur.etat(), "indisponible");
  });
  it("ne lit pas avec une voix étrangère quand le téléphone n'a aucune voix française", () => {
    const synthese = new FausseSynthese();
    synthese.voix = [voix("Samantha", "en-US")];
    const parleur = parleurAvec(synthese);
    parleur.lire(["Un."]);
    assert.equal(synthese.dites.length, 0);
    assert.equal(parleur.etat(), "indisponible");
  });
  it("dit même sans voix française trouvée quand les voix ne sont pas encore chargées", () => {
    const synthese = new FausseSynthese();
    synthese.voix = [];
    const parleur = parleurAvec(synthese);
    parleur.lire(["Un."]);
    assert.equal(synthese.dites[0].lang, "fr-FR");
    assert.equal(synthese.dites[0].voice, null);
  });
  it("reprend du début quand on relance pendant une lecture, sans écouter l'ancienne", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    parleur.lire(["Ancien 1.", "Ancien 2."]);
    const ancienne = synthese.dites[0];
    parleur.lire(["Nouveau."]);
    assert.equal(synthese.annulations, 1);
    assert.equal(synthese.dites.at(-1)?.text, "Nouveau.");
    ancienne.onend?.({});
    assert.equal(synthese.dites.length, 2, "la fin de l'ancienne phrase ne doit rien lancer");
  });
  it("continue la nouvelle lecture quand le téléphone signale « interrupted » pour l'ancienne (il le fait à chaque annulation)", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    parleur.lire(["Ancien 1.", "Ancien 2."]);
    parleur.lire(["Nouveau 1.", "Nouveau 2."]);
    synthese.echouer("interrupted", 0);
    assert.equal(parleur.etat(), "lecture");
    assert.equal(synthese.annulations, 1);
    synthese.finir();
    assert.equal(synthese.dites.at(-1)?.text, "Nouveau 2.");
  });
  it("n'annule rien quand rien ne parle (certains navigateurs perdent la phrase suivante après un annuler)", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    parleur.lire(["Un."]);
    assert.equal(synthese.annulations, 0);
  });
});

describe("arreter", () => {
  it("coupe la voix et revient au repos", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    parleur.lire(["Un.", "Deux."]);
    parleur.arreter();
    assert.equal(synthese.annulations, 1);
    assert.equal(parleur.etat(), "repos");
  });
  it("ignore la fin et l'erreur « interrupted » de la phrase coupée", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    parleur.lire(["Un.", "Deux."]);
    parleur.arreter();
    synthese.echouer("interrupted", 0);
    synthese.finir(0);
    assert.equal(synthese.dites.length, 1);
    assert.equal(synthese.annulations, 1, "l'erreur de la phrase coupée ne doit pas annuler une deuxième fois");
    assert.equal(parleur.etat(), "repos");
  });
  it("ne fait rien quand rien ne parle", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    let appels = 0;
    parleur.abonner(() => (appels += 1));
    parleur.arreter();
    assert.equal(appels, 0);
  });
});

describe("erreurs de la voix", () => {
  it("s'arrête et revient au repos quand le téléphone refuse de parler (pas de geste de la personne)", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    parleur.lire(["Un.", "Deux."]);
    synthese.echouer("not-allowed");
    assert.equal(parleur.etat(), "repos");
    assert.equal(synthese.dites.length, 1, "pas de morceau suivant après une erreur");
  });
  it("s'arrête aussi quand la synthèse échoue", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    parleur.lire(["Un.", "Deux."]);
    synthese.echouer("synthesis-failed");
    assert.equal(parleur.etat(), "repos");
  });
  it("peut relire après une erreur", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    parleur.lire(["Un."]);
    synthese.echouer("not-allowed");
    parleur.lire(["Deux."]);
    assert.equal(parleur.etat(), "lecture");
    assert.equal(synthese.dites.at(-1)?.text, "Deux.");
  });
});

describe("debloquer", () => {
  it("fait dire une phrase vide et muette pendant le geste de la personne, sans changer l'état", () => {
    const synthese = new FausseSynthese();
    const parleur = parleurAvec(synthese);
    let appels = 0;
    parleur.abonner(() => (appels += 1));
    parleur.debloquer();
    assert.equal(synthese.dites.length, 1);
    assert.equal(synthese.dites[0].text, "");
    assert.equal(synthese.dites[0].volume, 0);
    assert.equal(parleur.etat(), "repos");
    assert.equal(appels, 0);
  });
  it("ne fait rien quand le navigateur ne sait pas parler", () => {
    parleurAvec(undefined).debloquer();
  });
  it("ne fait rien quand le téléphone n'a aucune voix française", () => {
    const synthese = new FausseSynthese();
    synthese.voix = [voix("Samantha", "en-US")];
    parleurAvec(synthese).debloquer();
    assert.equal(synthese.dites.length, 0);
  });
});
