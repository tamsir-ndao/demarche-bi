// Tests des en-têtes de sécurité : chacun présent, rien de tiers dans la CSP, eval seulement en développement.
// Lancer : npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { directivesCsp, ENTETES_SECURITE, entetesSecurite } from "./entetes";

const enProduction = entetesSecurite(true);
const enDeveloppement = entetesSecurite(false);

function valeur(entetes: ReturnType<typeof entetesSecurite>, key: string): string {
  const entete = entetes.find((e) => e.key === key);
  assert.ok(entete, `en-tête ${key} manquant`);
  return entete.value;
}

describe("entetesSecurite", () => {
  it("envoie chaque en-tête attendu, une seule fois, sans retour à la ligne", () => {
    const cles = enProduction.map((e) => e.key);
    assert.deepEqual(cles, [
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]);
    for (const { value } of enProduction) assert.doesNotMatch(value, /[\r\n]/);
  });

  it("interdit les cadres, les objets et les bases détournées", () => {
    const csp = valeur(enProduction, "Content-Security-Policy");
    assert.match(csp, /(^|; )frame-ancestors 'none'(;|$)/);
    assert.match(csp, /(^|; )object-src 'none'(;|$)/);
    assert.match(csp, /(^|; )base-uri 'self'(;|$)/);
    assert.match(csp, /(^|; )form-action 'self'(;|$)/);
    assert.match(csp, /(^|; )default-src 'self'(;|$)/);
    assert.equal(valeur(enProduction, "X-Frame-Options"), "DENY");
  });

  it("n'autorise aucun hôte tiers ni blob: dans la CSP, et data: seulement pour les images", () => {
    const autorises = new Set(["'self'", "'none'", "'unsafe-inline'", "'unsafe-eval'"]);
    for (const directive of directivesCsp(false)) {
      const [nom, ...sources] = directive.split(" ");
      assert.match(nom, /^[a-z-]+$/);
      assert.ok(sources.length > 0, `directive ${nom} sans source`);
      for (const source of sources) {
        if (nom === "img-src" && source === "data:") continue;
        assert.ok(autorises.has(source), `source inattendue « ${source} » dans ${nom}`);
      }
    }
  });

  it("n'ajoute 'unsafe-eval' qu'en développement", () => {
    assert.doesNotMatch(valeur(enProduction, "Content-Security-Policy"), /unsafe-eval/);
    assert.match(valeur(enDeveloppement, "Content-Security-Policy"), /script-src 'self' 'unsafe-inline' 'unsafe-eval'/);
    // Les deux versions ne diffèrent que par là.
    assert.equal(
      valeur(enDeveloppement, "Content-Security-Policy").replace(" 'unsafe-eval'", ""),
      valeur(enProduction, "Content-Security-Policy"),
    );
  });

  it("laisse passer ce que le site utilise : scripts et styles inline, micro, service worker, manifeste", () => {
    const csp = valeur(enProduction, "Content-Security-Policy");
    assert.match(csp, /script-src 'self' 'unsafe-inline'(;|$)/);
    assert.match(csp, /style-src 'self' 'unsafe-inline'(;|$)/);
    assert.match(csp, /connect-src 'self'(;|$)/);
    assert.match(csp, /worker-src 'self'(;|$)/);
    assert.match(csp, /manifest-src 'self'(;|$)/);
    assert.match(valeur(enProduction, "Permissions-Policy"), /microphone=\(self\)/);
  });

  it("coupe la caméra, la position et le paiement, et ne fuit pas la question vers les sites externes", () => {
    const permissions = valeur(enProduction, "Permissions-Policy");
    assert.match(permissions, /camera=\(\)/);
    assert.match(permissions, /geolocation=\(\)/);
    assert.match(permissions, /payment=\(\)/);
    assert.equal(valeur(enProduction, "Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.equal(valeur(enProduction, "X-Content-Type-Options"), "nosniff");
  });

  it("ENTETES_SECURITE suit NODE_ENV", () => {
    const attendu = entetesSecurite(process.env.NODE_ENV === "production");
    assert.deepEqual(ENTETES_SECURITE, attendu);
  });
});
