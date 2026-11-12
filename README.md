# Brio — boutique de Noël Biscotte (retrait uniquement)

Site de commande en ligne pour une boulangerie : peu de références, **aucune livraison**, retrait sur un créneau dans un point de retrait.

## Fonctionnalités

**Côté client**
- Catalogue et panier (conservé dans le navigateur)
- Choix du point de retrait, puis d'un créneau (avec une capacité limitée par créneau)
- Délai minimum avant retrait (24 h par défaut, modifiable)
- Paiement par carte (Stripe Checkout), par virement (IBAN et référence affichés) ou en espèces au retrait
- Page de suivi de commande et emails de confirmation

**Back-office (`/admin`)**
- Tableau de bord : retraits du jour et du lendemain, virements en attente
- Commandes : filtres, recherche, changement de statut (prête, retirée, annulée), paiement reçu, emails au client
- Production : quantités à préparer par jour et par point de retrait (imprimable) et export CSV
- Produits : création, modification, photo, masquage
- Points de retrait et créneaux : génération en masse (période, jours, horaires, durée, capacité), puis modification ou fermeture individuelle
- Paramètres : ouverture ou fermeture des commandes, délai, modes de paiement, IBAN, email de notification

## Stack

Next.js 16 (App Router, Server Actions), PostgreSQL + Prisma 7, Tailwind CSS 4, Stripe, Nodemailer (SMTP).

## Développement local

```bash
cp .env.example .env      # puis compléter
npm install
npx prisma migrate dev    # crée les tables
npm run dev
```

Back-office : http://localhost:3000/admin (mot de passe = `ADMIN_PASSWORD`).

## Déploiement (Railway)

1. Un service **PostgreSQL** et un service pour ce dépôt GitHub.
2. Variables du service web : `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `APP_URL`, et, si besoin, Stripe et SMTP (voir `.env.example`).
3. `npm run build` puis `npm start` (qui applique automatiquement les migrations avec `prisma migrate deploy`).

### Stripe
- Mettre `STRIPE_SECRET_KEY`.
- Créer un webhook vers `https://<domaine>/api/stripe/webhook` avec les événements `checkout.session.completed`, `checkout.session.async_payment_succeeded` et `checkout.session.expired`, puis mettre `STRIPE_WEBHOOK_SECRET`.
- Une commande par carte bloque son créneau 40 minutes ; elle est annulée automatiquement si elle n'est pas payée.

### Emails
N'importe quel SMTP fonctionne (Gmail avec un mot de passe d'application, OVH, Brevo, Resend SMTP…). Sans configuration SMTP, les emails sont seulement écrits dans les logs.

## Sécurité

- Chaque page et chaque action de `/admin` appelle `requireAdmin()` avant de lire des données, et `src/proxy.ts` bloque `/admin/*` en amont. Toute nouvelle page admin doit faire de même : le contrôle du layout seul ne protège pas les données de la page.
- `SESSION_SECRET` doit être défini en production (longue chaîne aléatoire). Le changer déconnecte toutes les sessions admin.
- Connexion admin : 5 essais ratés par adresse IP par quart d'heure. Commandes : 8 par adresse IP par 10 minutes, 5 par adresse email par heure. Les compteurs sont en mémoire (une seule instance) et se basent sur l'en-tête `X-Real-IP` posé par Railway.
- Photos produit : JPG, PNG, WebP, GIF ou AVIF uniquement, reconnus d'après le contenu du fichier.
