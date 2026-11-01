// Tests de l'historique des conversations. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StockageLocal } from "../bienvenue";
import {
  CLE_HISTORIQUE,
  dateDeConversation,
  effacerHistorique,
  garderConversation,
  lireHistorique,
  MAX_CONVERSATIONS,
  retrouverConversation,
  supprimerConversation,
  toursAGarder,
  type ConversationGardee,
  type Tour,
  type TourPret,
} from "./historique";
import type { TourAssistant } from "./tour";

function memoireDuTelephone(): StockageLocal & { notes: Map<string, string> } {
  const notes = new Map<string, string>();
  return {
    notes,
    getItem: (cle) => notes.get(cle) ?? null,
    setItem: (cle, valeur) => void notes.set(cle, valeur),
    removeItem: (cle) => void notes.delete(cle),
  };
}

const pret: TourPret = { id: 1, question: "Passeport ?", etat: "pret", reponse: { texte: ["Oui"] } as TourAssistant };
const conversation = (id: string, maj = 1): ConversationGardee => ({ id, maj, tours: [pret], memoire: {} });

describe("historique des conversations", () => {
  it("ne garde que les vraies réponses", () => {
    const tours: Tour[] = [pret, { id: 2, question: "a", etat: "attente" }, { id: 3, question: "b", etat: "hors_ligne" }];
    assert.deepEqual(toursAGarder(tours), [pret]);
  });
  it("retrouve une conversation fermée puis rouverte, la plus récente en tête", () => {
    const stockage = memoireDuTelephone();
    garderConversation(stockage, conversation("a", 1));
    garderConversation(stockage, conversation("b", 2));
    assert.deepEqual(lireHistorique(stockage).map(({ id }) => id), ["b", "a"]);
    assert.equal(retrouverConversation(stockage, "a")?.id, "a");
  });
  it("met à jour une conversation qui continue, sans doublon", () => {
    const stockage = memoireDuTelephone();
    garderConversation(stockage, conversation("a", 1));
    garderConversation(stockage, conversation("b", 2));
    garderConversation(stockage, conversation("a", 3));
    assert.deepEqual(lireHistorique(stockage).map(({ id }) => id), ["a", "b"]);
  });
  it("ne dépasse pas le plafond : la plus ancienne sort", () => {
    const stockage = memoireDuTelephone();
    for (let i = 0; i <= MAX_CONVERSATIONS; i += 1) garderConversation(stockage, conversation(`c${i}`, i));
    const liste = lireHistorique(stockage);
    assert.equal(liste.length, MAX_CONVERSATIONS);
    assert.equal(retrouverConversation(stockage, "c0"), undefined);
  });
  it("mémoire pleine : retire les plus anciennes et garde la nouvelle", () => {
    const stockage = memoireDuTelephone();
    garderConversation(stockage, conversation("vieille", 1));
    const setItem = stockage.setItem;
    stockage.setItem = (cle, valeur) => {
      if ((JSON.parse(valeur) as unknown[]).length > 1) throw new Error("pleine");
      setItem(cle, valeur);
    };
    garderConversation(stockage, conversation("neuve", 2));
    assert.deepEqual(lireHistorique(stockage).map(({ id }) => id), ["neuve"]);
  });
  it("supprime une conversation, ou tout l'historique", () => {
    const stockage = memoireDuTelephone();
    garderConversation(stockage, conversation("a", 1));
    garderConversation(stockage, conversation("b", 2));
    supprimerConversation(stockage, "a");
    assert.deepEqual(lireHistorique(stockage).map(({ id }) => id), ["b"]);
    effacerHistorique(stockage);
    assert.deepEqual(lireHistorique(stockage), []);
  });
  it("mémoire illisible, absente ou bloquée : liste vide, sans planter", () => {
    const stockage = memoireDuTelephone();
    stockage.notes.set(CLE_HISTORIQUE, "{pas du json");
    assert.deepEqual(lireHistorique(stockage), []);
    stockage.notes.set(CLE_HISTORIQUE, JSON.stringify([{ id: 1 }, conversation("ok")]));
    assert.deepEqual(lireHistorique(stockage).map(({ id }) => id), ["ok"]);
    assert.deepEqual(lireHistorique(undefined), []);
    garderConversation({ ...stockage, getItem: () => { throw new Error("bloquée"); }, setItem: () => { throw new Error("bloquée"); } }, conversation("x"));
  });
  it("écrit la date en langage courant", () => {
    const maintenant = new Date(2026, 9, 31, 10).getTime();
    assert.equal(dateDeConversation(new Date(2026, 9, 31, 1).getTime(), maintenant), "Aujourd’hui");
    assert.equal(dateDeConversation(new Date(2026, 9, 30, 23).getTime(), maintenant), "Hier");
    assert.match(dateDeConversation(new Date(2026, 9, 28).getTime(), maintenant), /^28 oct/);
    assert.match(dateDeConversation(new Date(2025, 9, 28).getTime(), maintenant), /2025/);
  });
});
