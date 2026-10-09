// node scripts/check.mjs — vérifie que les fichiers requis existent et que
// le SQL ne contient plus de références à l'ancien schéma (user_id).
import { readFileSync, existsSync } from "node:fs";

const required = [
  "index.html",
  "login.html",
  "americana-dashboard.html",
  "js/supabase-config.js",
  "js/supabase-client.js",
  "sql/install-americana.sql",
];
let ok = true;
for (const f of required) {
  if (!existsSync(f)) { console.error("MANQUANT :", f); ok = false; }
}
const sql = readFileSync("sql/install-americana.sql", "utf8");
for (const bad of ["user_id = auth.uid()", "create table if not exists profiles ("]) {
  if (sql.includes(bad)) { console.error("OBSOLÈTE dans install-americana.sql :", JSON.stringify(bad)); ok = false; }
}
console.log(ok ? "CHECK OK — fichiers présents, SQL aligné schéma réel." : "CHECK KO");
process.exit(ok ? 0 : 1);
