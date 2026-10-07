export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Jënd-Jaay</h1>
      <p className="text-lg text-neutral-600">
        Sourcing alimentaire par IA : dis ce dont tu as besoin, on trouve les
        meilleurs fournisseurs et on compare leurs offres.
      </p>
      <div className="flex gap-3">
        <a
          href="/acheteur"
          className="rounded-lg bg-emerald-700 px-5 py-3 font-medium text-white"
        >
          Je suis acheteur
        </a>
        <a
          href="/fournisseur"
          className="rounded-lg border border-emerald-700 px-5 py-3 font-medium text-emerald-700"
        >
          Je suis fournisseur
        </a>
      </div>
    </main>
  );
}
