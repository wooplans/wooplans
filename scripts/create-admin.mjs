#!/usr/bin/env node
/**
 * Crée (ou réinitialise) un compte admin.
 *   node scripts/create-admin.mjs email@domaine.com "MotDePasseSolide" > /tmp/admin.sql
 *   npx wrangler d1 execute DB --remote --file /tmp/admin.sql
 * Même format de hachage que src/lib/crypto.ts (PBKDF2-SHA256, 100 000 itérations).
 */
import { pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const allowWeak = args.includes("--allow-weak");
const [email, password] = args.filter((a) => a !== "--allow-weak");
if (!email || !password || (password.length < 12 && !allowWeak)) {
  console.error("Usage : node scripts/create-admin.mjs <email> <mot de passe (12 caractères min.)> [--allow-weak]");
  process.exit(1);
}
if (password.length < 12) console.error("ATTENTION : mot de passe faible, à changer rapidement.");
const b64url = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const iterations = 100000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
const stored = `pbkdf2$${iterations}$${b64url(salt)}$${b64url(hash)}`;
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
console.log(
  `INSERT INTO admins (id, email, password_hash) VALUES (${q(randomUUID().replace(/-/g, ""))}, ${q(email.toLowerCase())}, ${q(stored)}) ` +
    `ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash;`,
);
