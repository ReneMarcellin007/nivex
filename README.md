# NIVEX — site & moteur de réservation

Site vitrine bilingue et système de rendez-vous pour **NIVEX**, service de
repassage à domicile de prestige (Longueuil · Rive-Sud · Montérégie).

L'artisan branche **son propre compte Google** depuis le site. Aucune
intervention technique n'est requise ensuite : ses disponibilités réelles
alimentent le calendrier public, chaque réservation s'inscrit dans son agenda,
et les confirmations partent de sa propre adresse Gmail.

---

## Ce que ça fait

**Pour les clients**
- Page d'accueil bilingue (FR / EN) avec l'histoire de la maison
- Tunnel de réservation en quatre étapes : prestations → adresse → créneau → confirmation
- Créneaux réels, calculés à partir de l'agenda Google de l'artisan
- Estimation de durée et de prix mise à jour en direct ; première heure offerte au premier rendez-vous
- Courriel de confirmation + invitation d'agenda, envoyés depuis l'adresse de l'artisan
- Lien personnel pour consulter ou annuler son rendez-vous, sans appeler

**Pour l'artisan** (`/admin`)
- Connexion en un clic avec Google — c'est la seule installation
- Liste des rendez-vous à venir et passés, avec téléphone, adresse cliquable et détail des pièces
- Réglages sans code : horaires, taux horaire, durées par prestation, tampon de déplacement,
  délai de prévenance, zone desservie, pause pendant les vacances
- Choix de l'agenda de travail parmi ses agendas Google
- Révocation de l'accès en un clic

---

## Architecture

| Élément | Choix | Pourquoi |
|---|---|---|
| Cadre | Next.js 16 (App Router) | rendu serveur, routes API, déploiement Vercel natif |
| Style | Tailwind CSS v4 | jetons de design en CSS pur, aucune configuration JS |
| Base | Postgres (Neon, via Vercel) | réservations + réglages + jeton chiffré |
| Google | OAuth 2.0, Calendar v3, Gmail v1 | appels `fetch` directs, sans SDK lourd |
| Session | JWT signé (`jose`), cookie HttpOnly | pas de session serveur à gérer |

### Sécurité

- Le jeton de rafraîchissement Google est chiffré **AES-256-GCM** avant d'entrer en base.
- Le premier compte Google qui se connecte devient le propriétaire ; un
  `ADMIN_SETUP_CODE` peut être exigé pour cette toute première fois.
- Toute durée et tout prix sont **recalculés côté serveur** : le navigateur ne
  fait que proposer.
- Un index unique sur `starts_at` rend la double réservation impossible, même
  en cas de clics simultanés.
- Pot de miel + limite de trois réservations par courriel et par heure.
- Les fuseaux horaires sont calculés via `Intl`, bascules d'heure comprises.

---

## Variables d'environnement

Voir [`.env.example`](.env.example).

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | origine publique — doit correspondre à l'URI de redirection Google |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | identifiants OAuth |
| `DATABASE_URL` | Postgres (injecté par l'intégration Neon de Vercel) |
| `ENCRYPTION_KEY` | 32 octets — chiffre le jeton Google (`openssl rand -hex 32`) |
| `SESSION_SECRET` | signe les cookies d'administration (`openssl rand -base64 48`) |
| `ADMIN_SETUP_CODE` | optionnel — exigé à la première connexion |

## État actuel

| | |
|---|---|
| Site en production | https://nivex-repassage.vercel.app |
| Espace artisan | https://nivex-repassage.vercel.app/admin |
| Diagnostic d'installation | https://nivex-repassage.vercel.app/api/health |
| Hébergement | Vercel — déploiement automatique à chaque `push` sur `main` |

**Ce qui reste à brancher** (les deux se voient sur `/api/health`) :

1. **Base de données** — dans le tableau de bord Vercel du projet, onglet
   *Storage* → *Create Database* → **Neon**. Vercel injecte `DATABASE_URL`
   tout seul ; le schéma se crée au premier appel.
2. **Identifiants Google** — voir *Console Google Cloud* plus bas, puis
   poser `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans les variables
   d'environnement Vercel.

Tant que ce n'est pas fait, le site fonctionne et reste présentable : le
formulaire de réservation affiche le numéro de téléphone, et le formulaire
de contact invite à appeler. Rien ne casse.

## Développement

```bash
npm install
cp .env.example .env.local   # puis remplir
npm run dev
```

Diagnostic d'installation : `GET /api/health` (aucun secret n'y est exposé).

## Console Google Cloud

1. Créer un projet, puis activer **Google Calendar API** et **Gmail API**.
2. Écran de consentement OAuth : type externe, ajouter l'artisan en utilisateur
   de test tant que l'application n'est pas vérifiée.
3. Identifiants → ID client OAuth → application Web.
4. URI de redirection autorisée :
   `https://VOTRE-DOMAINE/api/auth/google/callback`
   (et `http://localhost:3000/api/auth/google/callback` pour le développement).
5. Portées demandées : `openid`, `email`, `profile`,
   `.../auth/calendar`, `.../auth/gmail.send`.

---

## Structure

```
src/
├── app/
│   ├── [locale]/          pages publiques (fr | en)
│   ├── admin/             espace artisan
│   └── api/               OAuth, disponibilités, réservations, réglages
├── components/
│   ├── home/              sections de la page d'accueil
│   ├── booking/           tunnel de réservation
│   └── admin/             tableau de bord
└── lib/
    ├── availability.ts    moteur de créneaux
    ├── bookings.ts        création, annulation, statistiques
    ├── google.ts          OAuth + Calendar + Gmail
    ├── time.ts            fuseaux horaires (Intl, sans dépendance)
    ├── email.ts           gabarits de courriel
    └── i18n/              dictionnaires FR / EN
```
