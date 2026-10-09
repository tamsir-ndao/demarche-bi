const REPO = "https://github.com/tamsir-ndao/demarche-bi";

function Arrow({ color = "#fff", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Check({ color = "#16150f", size = 16 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

const ETAPES = [
  { n: "01", t: "Comprendre", d: "L’IA transforme ta question, écrite ou parlée, en mots-clés. Français, parfois mêlé de wolof.", b: "Texte ou voix" },
  { n: "02", t: "Retrouver", d: "Le code cherche les fiches pertinentes. Recherche lexicale, sans IA, donc prévisible.", b: "Aucune invention possible" },
  { n: "03", t: "Répondre", d: "L’IA rédige une réponse claire à partir de ces fiches seulement.", b: "Fiches vérifiées uniquement" },
  { n: "04", t: "Vérifier", d: "Des garde-fous contrôlent les fiches utilisées et chaque chiffre cité.", b: "Sinon : « je ne sais pas »" },
  { n: "05", t: "Citer", d: "Le code ajoute les sources officielles et la date de vérification.", b: "Sources toujours affichées" },
];

const FAQ = [
  { q: "D’où viennent les informations ?", r: "Uniquement de fiches Markdown ouvertes, écrites à partir de sources officielles. Chaque fiche liste ses sources avec l’URL et la date de consultation, et indique qui l’a vérifiée et quand." },
  { q: "Que se passe-t-il si l’assistant ne sait pas ?", r: "Il le dit. Si aucune fiche ne correspond ou si une réponse échoue aux contrôles, il répond « je ne sais pas » plutôt que d’inventer une procédure." },
  { q: "Puis-je me fier aux réponses pour mes démarches ?", r: "Les informations sont indicatives. Confirme toujours auprès de l’administration concernée avant de te déplacer ou de payer quoi que ce soit." },
  { q: "Comment ajouter ou corriger une fiche ?", r: "Par une pull request sur GitHub. Un modèle de fiche et un validateur automatique sont fournis, et le guide de contribution explique la méthode pas à pas." },
  { q: "L’application collecte-t-elle mes données ?", r: "Aucune donnée personnelle n’est demandée. Un journal anonyme des questions est optionnel et l’application fonctionne sans base de données." },
];

export default function Home() {
  return (
    <div style={{ overflowX: "hidden" }}>
      {/* NAV */}
      <header style={{ position: "absolute", left: 0, right: 0, top: 18, zIndex: 20, padding: "0 16px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 12px 10px 28px", background: "rgba(255,255,255,.88)", backdropFilter: "blur(14px)", border: "1px solid var(--line)", borderRadius: 999, boxShadow: "0 14px 40px rgba(22,21,15,.07)" }}>
          <a href="#accueil" aria-label="Démarche-Bi, accueil" className="d" style={{ fontSize: 27, fontWeight: 800, lineHeight: 1, whiteSpace: "nowrap" }}>
            Démarche-Bi
          </a>
          <nav className="nav" style={{ display: "flex", gap: 34 }} aria-label="Navigation principale">
            <a href="#fonctionnement">Comment ça marche</a>
            <a href="#fiches">Les fiches</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a className="btn y sm" href={REPO}>
            GitHub
            <i><Arrow size={16} /></i>
          </a>
        </div>
      </header>

      {/* HERO */}
      <section id="accueil" style={{ position: "relative", padding: "176px 0 40px", overflow: "hidden" }}>
        <div aria-hidden="true" style={{ position: "absolute", top: -180, left: "50%", width: 1100, height: 700, marginLeft: -550, background: "radial-gradient(closest-side,rgba(249,203,27,.38),transparent)", pointerEvents: "none" }} />
        <div className="w" style={{ position: "relative", textAlign: "center" }}>
          <span className="tag"><span className="dot" />Open Source × AI Hackathon 2026 · Civic Tech</span>
          <h1 className="d h1" style={{ margin: "28px auto 0", maxWidth: 1000, fontSize: 96, lineHeight: 0.98, fontWeight: 800 }}>
            Vos démarches au Sénégal, enfin{" "}
            <span style={{ position: "relative", display: "inline-block", zIndex: 0 }}>
              claires
              <svg aria-hidden="true" viewBox="0 0 300 24" preserveAspectRatio="none" style={{ position: "absolute", left: "-2%", bottom: -6, width: "104%", height: ".26em", zIndex: -1 }}>
                <path d="M3 16C70 4 150 2 297 10" stroke="#f9cb1b" strokeWidth="12" strokeLinecap="round" fill="none" />
              </svg>
            </span>
          </h1>
          <p style={{ margin: "30px auto 0", maxWidth: 640, fontSize: 21, lineHeight: 1.6, color: "var(--mut)" }}>
            Un assistant open source qui répond uniquement à partir de fiches vérifiées, avec les sources officielles. Quand il ne sait pas, il le dit.
          </p>
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <a className="btn y" href="#fonctionnement" style={{ minHeight: 68, fontSize: 20, paddingLeft: 38 }}>
              Voir comment ça marche
              <i><Arrow size={18} /></i>
            </a>
            <span style={{ fontSize: 15, color: "var(--mut)", display: "flex", alignItems: "center", gap: 8 }}>
              <Check /> Projet en développement · information indicative
            </span>
          </div>

          <div className="hero-ui" style={{ margin: "76px auto 0", maxWidth: 1100, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.5fr) minmax(0,1fr)", gap: 22, alignItems: "center", textAlign: "left" }}>
            <div className="glass" style={{ padding: 24, transform: "rotate(-3deg) translateY(24px)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".16em", color: "var(--mut)" }}>FICHE</span>
              <div className="d" style={{ marginTop: 12, fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>Pièces, étapes, coût, délai, lieu</div>
              <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--mut)" }}>
                Un champ inconnu vaut <code>null</code>, jamais une approximation.
              </p>
            </div>

            <div className="chat" aria-label="Exemple de conversation">
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 700 }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--ink)", color: "var(--y)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>DB</span>
                Démarche-Bi
              </div>
              <div className="bub q">[Ta question sur une démarche]</div>
              <div className="bub">
                Voici ce que disent les fiches vérifiées : pièces, étapes, coût, délai, lieu.
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(0,0,0,.12)", fontSize: 14, color: "#3d3c34" }}>
                  Source : [site officiel] · vérifié le [date]
                </div>
              </div>
              <div className="bub q">[Une question hors fiches]</div>
              <div className="bub">Je n’ai pas de fiche vérifiée sur ce sujet, donc je préfère ne pas répondre.</div>
            </div>

            <div className="glass" style={{ padding: 24, transform: "rotate(3deg) translateY(24px)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".16em", color: "var(--mut)" }}>STATUT</span>
              <div className="d" style={{ marginTop: 10, fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>Brouillon ou vérifié</div>
              <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.5, color: "var(--mut)" }}>
                Seules les fiches vérifiées répondent aux utilisateurs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section aria-hidden="true" style={{ padding: "56px 0", overflow: "hidden", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", marginTop: 40, background: "#fff" }}>
        <div className="mq d" style={{ fontSize: 44, fontWeight: 700 }}>
          {[0, 1].map((k) =>
            ["Sources officielles", "Fiches vérifiées", "Texte et voix", "Open source", "Je ne sais pas"].map((m) => (
              <span key={`${k}-${m}`} style={{ display: "inline-flex", gap: 56 }}>
                <span>{m}</span>
                <span style={{ color: "var(--y)" }}>✦</span>
              </span>
            )),
          )}
        </div>
      </section>

      {/* POURQUOI (bento) */}
      <section className="sec" style={{ padding: "110px 0" }}>
        <div className="w">
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 24 }}>
            <div style={{ maxWidth: 720 }}>
              <span className="tag"><span className="dot" />Le problème</span>
              <h2 className="d h2">Une démarche administrative ne se devine pas.</h2>
            </div>
            <p style={{ margin: 0, maxWidth: 340, fontSize: 17, lineHeight: 1.6, color: "var(--mut)" }}>
              L’information existe, mais elle est dispersée, parfois périmée, et rarement sourcée.
            </p>
          </div>
          <div className="bento" style={{ marginTop: 56 }}>
            <div className="bt" style={{ gridColumn: "span 7", background: "var(--y)" }}>
              <span className="d" style={{ fontSize: 20, fontWeight: 700, opacity: 0.55 }}>01</span>
              <p className="d" style={{ margin: 0, fontSize: 38, lineHeight: 1.1, fontWeight: 700 }}>Les réponses trouvées en ligne citent rarement leur source.</p>
            </div>
            <div className="bt" style={{ gridColumn: "span 5", background: "var(--ink)", color: "#fff" }}>
              <span className="d" style={{ fontSize: 20, fontWeight: 700, color: "var(--y)" }}>02</span>
              <p className="d" style={{ margin: 0, fontSize: 30, lineHeight: 1.15, fontWeight: 700 }}>Un assistant généraliste peut inventer une procédure avec assurance.</p>
            </div>
            <div className="bt" style={{ gridColumn: "span 5", background: "#fff", border: "1px solid var(--line)" }}>
              <span className="d" style={{ fontSize: 20, fontWeight: 700, color: "var(--mut)" }}>03</span>
              <p className="d" style={{ margin: 0, fontSize: 30, lineHeight: 1.15, fontWeight: 700 }}>Démarche-Bi ne répond qu’avec des fiches vérifiées.</p>
            </div>
            <div className="bt" style={{ gridColumn: "span 7", background: "var(--blue)" }}>
              <span className="d" style={{ fontSize: 20, fontWeight: 700, opacity: 0.55 }}>04</span>
              <p className="d" style={{ margin: 0, fontSize: 38, lineHeight: 1.1, fontWeight: 700 }}>Sans fiche, sans certitude : « je ne sais pas ».</p>
            </div>
          </div>
        </div>
      </section>

      {/* FONCTIONNEMENT (timeline) */}
      <section id="fonctionnement" className="sec" style={{ padding: "120px 0", background: "var(--ink)", color: "#fff", borderRadius: "48px 48px 0 0" }}>
        <div className="w">
          <div className="fgrid" style={{ display: "grid", gridTemplateColumns: "minmax(0,5fr) minmax(0,7fr)", gap: 72, alignItems: "start" }}>
            <div style={{ position: "sticky", top: 40 }}>
              <span className="tag dark"><span className="dot" />Comment ça marche</span>
              <h2 className="d h2" style={{ color: "#fff" }}>Cinq étapes. Zéro invention.</h2>
              <p style={{ margin: "24px 0 0", fontSize: 18, lineHeight: 1.6, color: "#b9b6a6", maxWidth: 420 }}>
                L’IA comprend et rédige. Le code cherche, contrôle et cite. Aucun fait administratif ne vient de la mémoire du modèle.
              </p>
            </div>
            <div>
              {ETAPES.map((e) => (
                <div className="step" key={e.n}>
                  <div className="d num" style={{ width: 84, height: 84, borderRadius: 26, background: "var(--y)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, fontWeight: 800 }}>{e.n}</div>
                  <div style={{ background: "#201f18", border: "1px solid rgba(255,255,255,.1)", borderRadius: 28, padding: 30 }}>
                    <div className="d" style={{ fontSize: 30, fontWeight: 700 }}>{e.t}</div>
                    <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: 1.6, color: "#b9b6a6" }}>{e.d}</p>
                    <div style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 14, background: "rgba(249,203,27,.12)", color: "var(--y)", fontSize: 15, fontWeight: 600 }}>
                      <Check color="currentColor" size={18} />
                      {e.b}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FICHES OUVERTES */}
      <section id="fiches" className="sec" style={{ padding: "120px 0", background: "var(--ink)" }}>
        <div className="w">
          <div style={{ background: "var(--y)", borderRadius: 44, padding: 64, position: "relative", overflow: "hidden" }}>
            <div className="s2" style={{ position: "relative", display: "grid", gridTemplateColumns: "minmax(0,5fr) minmax(0,7fr)", gap: 56, alignItems: "center" }}>
              <div style={{ aspectRatio: "4/5", borderRadius: 32, background: "var(--ink)", position: "relative", overflow: "hidden", display: "flex", alignItems: "flex-end", padding: 24 }}>
                <span className="d" aria-hidden="true" style={{ position: "absolute", top: -24, left: -6, fontSize: 300, fontWeight: 800, color: "rgba(249,203,27,.14)", lineHeight: 1 }}>.md</span>
                <pre style={{ position: "relative", margin: 0, color: "#e7e3d5", fontSize: 13, lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
{`slug: nom-de-la-demarche
categorie: autre
cout: null
sources:
  - titre: [page officielle]
    url: https://...
statut: brouillon`}
                </pre>
              </div>
              <div>
                <span className="tag" style={{ background: "rgba(255,255,255,.5)", borderColor: "transparent" }}>Le cœur ouvert du projet</span>
                <h2 className="d h2" style={{ fontSize: 50 }}>Chaque démarche est un fichier que tout le monde peut améliorer</h2>
                <p style={{ margin: "22px 0 0", fontSize: 19, lineHeight: 1.6, color: "#3b3200" }}>
                  Un en-tête validé automatiquement : pièces, étapes, coût, délai, lieu, sources officielles et statut de vérification. Ajoute ou corrige une fiche par pull request.
                </p>
                <div style={{ marginTop: 32, display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {["Sources officielles", "Validateur automatique", "Licence MIT", "Fiches datées"].map((t) => (
                    <span key={t} style={{ padding: "12px 18px", borderRadius: 99, background: "var(--ink)", color: "#fff", fontSize: 15, fontWeight: 600 }}>{t}</span>
                  ))}
                </div>
                <div style={{ marginTop: 36 }}>
                  <a className="btn" href={`${REPO}/blob/main/CONTRIBUTING.md`}>
                    Contribuer une fiche
                    <i><Arrow color="#16150f" /></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="sec" style={{ padding: "120px 0" }}>
        <div className="w">
          <div className="fgrid" style={{ display: "grid", gridTemplateColumns: "minmax(0,4fr) minmax(0,8fr)", gap: 72, alignItems: "start" }}>
            <div style={{ position: "sticky", top: 40 }}>
              <span className="tag"><span className="dot" />Questions fréquentes</span>
              <h2 className="d h2">Tout ce que vous devez savoir</h2>
            </div>
            <div>
              {FAQ.map((f, i) => (
                <details className="fq" key={f.q} open={i === 0}>
                  <summary>
                    {f.q}
                    <b>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16150f" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                    </b>
                  </summary>
                  <p>{f.r}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="sec" style={{ padding: "0 0 100px" }}>
        <div className="w">
          <div style={{ position: "relative", background: "var(--ink)", color: "#fff", borderRadius: 44, padding: "96px 48px", textAlign: "center", overflow: "hidden" }}>
            <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "-40%", width: 900, height: 700, marginLeft: -450, background: "radial-gradient(closest-side,rgba(249,203,27,.45),transparent)" }} />
            <h2 className="d big" style={{ position: "relative", margin: "0 auto", maxWidth: 900, fontSize: 76, lineHeight: 1, fontWeight: 800 }}>Une réponse sourcée, ou rien.</h2>
            <p style={{ position: "relative", margin: "22px auto 0", maxWidth: 520, fontSize: 19, lineHeight: 1.6, color: "#c9c7bb" }}>
              Suis le projet, teste-le, ou ajoute la fiche qui manque.
            </p>
            <div style={{ position: "relative", marginTop: 38, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <a className="btn y" href={REPO} style={{ minHeight: 68, fontSize: 20, paddingLeft: 38 }}>
                Voir le projet sur GitHub
                <i><Arrow size={18} /></i>
              </a>
              <span style={{ fontSize: 15, color: "#c9c7bb" }}>Gratuit, open source, licence MIT.</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="fl" style={{ background: "var(--ink)", color: "#fff", padding: "72px 0 36px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div className="w">
          <div className="s3" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 48 }}>
            <div>
              <div className="d" style={{ fontSize: 28, fontWeight: 800 }}>Démarche-Bi</div>
              <p style={{ margin: "18px 0 0", fontSize: 15, lineHeight: 1.65, color: "#9d9a8a", maxWidth: 320 }}>
                Assistant open source sur les démarches administratives au Sénégal. Information indicative : confirme toujours auprès de l’administration concernée.
              </p>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#9d9a8a", marginBottom: 18 }}>PROJET</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <a href="#fonctionnement">Comment ça marche</a>
                <a href="#fiches">Les fiches</a>
                <a href="#faq">FAQ</a>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".2em", color: "#9d9a8a", marginBottom: 18 }}>OPEN SOURCE</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <a href={REPO}>Code source</a>
                <a href={`${REPO}/blob/main/CONTRIBUTING.md`}>Contribuer</a>
                <a href={`${REPO}/blob/main/LICENSE`}>Licence MIT</a>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 52, paddingTop: 26, borderTop: "1px solid rgba(255,255,255,.1)", fontSize: 14, color: "#7d7a6c" }}>
            © 2026 Tamsir Ndao · Open Source × AI Hackathon 2026, Galsen DEV
          </div>
        </div>
      </footer>
    </div>
  );
}
