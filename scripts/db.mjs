// Applique les migrations SQL (db/migrations/*.sql) sur la base Postgres (Neon).
//   npm run db:migrate
// Les migrations déjà appliquées sont enregistrées dans la table schema_migrations
// et ne sont pas rejouées : on peut relancer la commande sans risque.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

// Charge .env.local sans dépendance supplémentaire
try {
  const env = readFileSync(".env.local", "utf8");
  for (const line of env.split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
} catch {
  // pas de .env.local : on utilise l'environnement du shell
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL manquante. Renseigne-la dans .env.local (voir docs/SETUP.md).");
  process.exit(1);
}

const files = readdirSync("db/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const { rows } = await client.query("select name from schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`= ${file} (déjà appliquée)`);
      continue;
    }
    console.log(`> ${file}`);
    await client.query("begin");
    try {
      await client.query(readFileSync(join("db/migrations", file), "utf8"));
      await client.query("insert into schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      count++;
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  }
  console.log(count ? `Terminé : ${count} migration(s) appliquée(s).` : "Rien à appliquer.");
} catch (err) {
  console.error("Erreur SQL :", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
