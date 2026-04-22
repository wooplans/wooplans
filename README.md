# WooPlans

Catalogue de plans de construction avec espace public, contenu premium et dashboard admin.

## Stack

- Next.js 14
- Prisma ORM
- SQLite en local
- Cloudflare Pages + Cloudflare D1 en production
- Cloudflare R2 pour les uploads d'images

## Installation locale

1. Installer les dependances

```bash
npm install
```

2. Copier les variables d'environnement

```bash
cp .env.example .env
```

3. Utiliser SQLite en local

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-secret-key-here"
```

4. Initialiser la base

```bash
npx prisma migrate dev --name init
npm run db:seed
```

5. Lancer le projet

```bash
npm run dev
```

## Variables Cloudflare Pages

Ajoute ces variables dans `Settings > Variables and Secrets` :

```env
AUTH_SECRET="your-secret-key-here"
ADMIN_EMAIL="admin@wooplans.com"
ANTHROPIC_API_KEY="your-anthropic-api-key"
R2_ACCOUNT_ID="your-r2-account-id"
R2_BUCKET_NAME="your-r2-bucket-name"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
```

## Configuration D1

La production attend un binding Cloudflare D1 nomme `DB`, declare dans [`wrangler.toml`](/C:/Users/BATIBOO%20SARL/Documents/New%20folder/wooplans-repo/wrangler.toml).

Dans [`wrangler.toml`](/C:/Users/BATIBOO%20SARL/Documents/New%20folder/wooplans-repo/wrangler.toml) :

1. Cree une base D1
2. Remplace `REPLACE_WITH_YOUR_D1_DATABASE_ID` par l'identifiant reel de la base
3. Redeploie l'application

En local, le projet continue de fonctionner sur SQLite tant que le binding D1 n'est pas present.

## Migrations D1

Prisma reste la source du schema, mais les migrations de production doivent etre appliquees a D1 avec Wrangler.

Exemple de flux :

```bash
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0001_init.sql
npx wrangler d1 execute <DB_NAME> --remote --file=prisma/migrations/0001_init.sql
```

Remplace `<DB_NAME>` par le nom de ta base D1.

## Seed

Le seed Prisma actuel sert au developpement local SQLite :

```bash
npm run db:seed
```

Il cree :

- 6 plans de demonstration
- 1 compte admin `admin@wooplans.com`

Pour la production D1, le plus simple est soit :

1. creer les plans depuis le dashboard admin
2. ou executer un script SQL de seed via `wrangler d1 execute`

## Build

```bash
npm run build
```

## Deploiement Cloudflare Pages

- `compatibility_flags = ["nodejs_compat"]`
- build command : `npx @cloudflare/next-on-pages@1`
- output directory : `.vercel/output/static`
- binding D1 requis : `DB` via [`wrangler.toml`](/C:/Users/BATIBOO%20SARL/Documents/New%20folder/wooplans-repo/wrangler.toml)

## Scripts utiles

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run db:seed`
