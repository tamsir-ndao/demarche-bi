// Applique les fichiers SQL sur la base Neon.
//   npm run db:migrate   -> db/migrations/*.sql (ordre alphabétique)
//   npm run db:seed      -> db/seed.sql (données de démo fictives)
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const command = process.argv[2];
if (!["migrate", "seed"].includes(command)) {
  console.error("Usage : node scripts/db.mjs <migrate|seed>");
  process.exit(1);
}

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

const files =
  command === "migrate"
    ? readdirSync("db/migrations")
        .filter((f) => f.endsWith(".sql"))
        .sort()
        .map((f) => join("db/migrations", f))
    : ["db/seed.sql"];

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
await client.connect();

try {
  for (const file of files) {
    console.log(`> ${file}`);
    await client.query(readFileSync(file, "utf8"));
  }
  console.log("Terminé.");
} catch (err) {
  console.error("Erreur SQL :", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
