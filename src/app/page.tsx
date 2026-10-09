export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
        Open Source × AI Hackathon 2026
      </p>
      <h1 className="text-4xl font-bold tracking-tight">Démarche-Bi</h1>
      <p className="text-lg text-neutral-600">
        Pose ta question sur une démarche administrative au Sénégal. Les réponses
        viennent uniquement de fiches vérifiées, avec leurs sources officielles.
        Quand l&apos;information n&apos;existe pas, on te le dit.
      </p>
      <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
        Projet en construction. Information indicative : confirme toujours
        auprès de l&apos;administration concernée.
      </p>
      <a
        href="https://github.com/tamsir-ndao/demarche-bi"
        className="w-fit rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white"
      >
        Voir le code et contribuer
      </a>
    </main>
  );
}
