# WooPlans — Plans de construction en Afrique

Plateforme de plans de construction pour l'Afrique. Une collection complète de plans maison avec tous les détails nécessaires pour réaliser votre projet de construction.

## 🎯 Fonctionnalités

### Public
- **Catalogue complet** : Explorez tous les plans de construction avec leurs caractéristiques
- **Détails détaillés** : Surface, nombre de chambres, salles de bain, étages
- **Visualisation** : Galerie d'images haute qualité pour chaque plan
- **Contenu Premium** : Accessible uniquement aux abonnés

### Abonnement Premium
- **12 mois d'accès illimité** : Consultez tous les plans sans restriction
- **Plans de distribution** : Agencement complet avec cotations
- **Devis estimatifs** : Budget détaillé par poste de construction
- **Échanges architectes** : Contactez nos experts sur WhatsApp

### Administration
- **Gestion des plans** : CRUD complet pour les plans de construction
- **Upload d'images** : Intégration facile pour les fichiers
- **Gestion des abonnés** : Liste, activation/désactivation des abonnés
- **Tableau de bord** : Vue d'ensemble de l'activité

## 🚀 Installation

### Prérequis
- Node.js 18+
- npm ou yarn

### Étapes

1. **Cloner le repository**
```bash
git clone <repository-url>
cd woo-plans
```

2. **Installer les dépendances**
```bash
npm install
# ou
yarn install
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos valeurs :

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="votre-secret-unique-ici"
NEXTAUTH_URL="http://localhost:3000"
FLUTTERWAVE_SECRET_KEY="votre-flutterwave-secret-key"
FLUTTERWAVE_WEBHOOK_SECRET="votre-webhook-secret"
```

### Obtention des clés Flutterwave

1. Créez un compte sur [Flutterwave](https://flutterwave.com)
2. Accédez à votre tableau de bord développeur
3. Obtenez votre **Secret Key** depuis la section "API Keys"
4. Configurez le webhook pour recevoir les paiements réussis

4. **Initialiser la base de données**
```bash
npx prisma migrate dev --name init
```

5. **Créer un compte admin**
```bash
npx prisma db seed
```

6. **Lancer le serveur de développement**
```bash
npm run dev
# ou
yarn dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 🛠️ Composants

### API Routes
- `POST /api/payments/checkout` : Initialise un paiement
- `GET /api/payments/verify/:tx_ref` : Vérifie un paiement
- `POST /api/payments/callback` : Page de retour après paiement
- `POST /api/webhooks/flutterwave` : Traitement des événements paiement
- `GET/POST /api/admin/plans` : CRUD des plans
- `GET/PUT/DELETE /api/admin/subscribers` : Gestion des abonnés

### Pages
- `/` : Page d'accueil
- `/plans` : Catalogue des plans
- `/plans/[slug]` : Détails d'un plan
- `/abonnement` : Page d'abonnement
- `/connexion` : Connexion abonnés
- `/admin` : Dashboard administration
- `/admin/plans` : Gestion des plans
- `/admin/subscribers` : Gestion des abonnés

## 📊 Base de données

Le projet utilise SQLite avec Prisma ORM.

### Modèles

#### Plan
- `id`, `slug`, `name`, `category`
- `description`, `surface`, `bedrooms`, `bathrooms`, `floors`
- `rooms`, `images`, `thumbnail`
- `estimatedCost`, `estimatedCostImage`
- `distributionPlans`, `distributionPlanUrl`
- `featured`, `published`

#### Subscriber
- `id`, `email`
- `chariowCustomerId`, `chariowLicenseKey`
- `isActive`, `expiresAt`

#### Admin
- `id`, `email`, `passwordHash`

### Scripts Prisma
```bash
npx prisma studio          # Interface graphique
npx prisma generate         # Génération du client Prisma
npx prisma migrate dev      # Créer une migration
npx prisma migrate deploy   # Appliquer les migrations
npx prisma db seed          # Données de test
```

## 🎨 Utilisation

### En tant qu'admin
- Accédez à [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Connectez-vous avec votre email et mot de passe
- Gérez les plans, les abonnés et consultez le dashboard

### En tant qu'abonné
1. Connectez-vous sur [http://localhost:3000/connexion](http://localhost:3000/connexion)
2. Entrez votre email et votre clé de licence (reçue après achat)
3. Accédez au contenu premium dans le catalogue

## 🔐 Sécurité

- Tous les paiements sont sécurisés via Flutterwave
- Les mots de passe sont hashés avec bcrypt
- Les sessions sont gérées par NextAuth
- Middleware protège les routes admin

## 🚢 Déploiement

### Configuration de production

1. **Variables d'environnement**
```env
DATABASE_URL="postgresql://user:password@host:5432/wooplans"
NEXTAUTH_SECRET="votre-secret-unique-généré"
NEXTAUTH_URL="https://www.votre-domaine.com"
FLUTTERWAVE_SECRET_KEY="FLWSECK-..."
FLUTTERWAVE_WEBHOOK_SECRET="webhook-secret-..."
```

2. **Build**
```bash
npm run build
```

3. **Lancer en production**
```bash
npm start
```

### Configuration Flutterwave Webhook

Configurez votre webhook Flutterwave pour pointer vers :
```
https://www.votre-domaine.com/api/webhooks/flutterwave
```

## 📝 Scripts disponibles

- `npm run dev` : Serveur de développement
- `npm run build` : Build pour production
- `npm start` : Démarrer en production
- `npm run lint` : Vérifier le code
- `npm run prisma:generate` : Génération Prisma
- `npm run prisma:studio` : Ouvrir Prisma Studio
- `npm run prisma:migrate` : Migrations base de données
- `npm run db:seed` : Créer des données de test

## 🤝 Contribuer

Contribuez à WooPlans en créant des plans de construction, en améliorant l'interface ou en signalant des bugs.

## 📄 Licence

© 2026 WooPlans. Tous droits réservés.

## 📞 Contact

Pour toute question ou support :
- Email : support@wooplans.com
- WhatsApp : +237 XXXX XXXX

## 🙏 Remerciements

- Flutterwave pour la solution de paiement
- Next.js et l'écosystème React
- Prisma pour l'ORM
- TailwindCSS pour le styling

---

Fait avec ❤️ pour l'Afrique
