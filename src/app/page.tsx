import { Bienvenue } from "@/components/Bienvenue";
import { Conversation } from "@/components/Conversation";
import { PageShell } from "@/components/PageShell";

export default function Accueil() {
  return (
    <PageShell actif="question" large>
      <Conversation />

      {/* Présentation en trois paliers au premier lancement (ou `/?presentation`) : rien côté serveur, la page reste prérendue. */}
      <Bienvenue />
    </PageShell>
  );
}
