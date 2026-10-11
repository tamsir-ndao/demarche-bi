// Tests des liens vers le dépôt GitHub. Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { REPO_URL, URL_CONTRIBUER, URL_SIGNALER, urlCorrectionFiche } from "./liens";

describe("liens du dépôt", () => {
  it("pointe vers le dépôt public du projet", () => {
    assert.equal(REPO_URL, "https://github.com/tamsir-ndao/demarche-bi");
  });

  it("construit les pages de contribution et de signalement à partir du dépôt", () => {
    assert.equal(URL_CONTRIBUER, `${REPO_URL}/blob/main/CONTRIBUTING.md`);
    assert.equal(URL_SIGNALER, `${REPO_URL}/issues/new/choose`);
  });

  it("ouvre l'éditeur GitHub sur le fichier de la fiche", () => {
    assert.equal(
      urlCorrectionFiche("duplicata-carte-nationale-identite"),
      `${REPO_URL}/edit/main/content/demarches/duplicata-carte-nationale-identite.md`,
    );
  });
});
