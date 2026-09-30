# api-lunar-devs

API backend de l'équipe **Lunar Devs** pour le hackathon 24h **Webcup
Comores** (3-4 octobre 2026).

> ⚠️ **Statut : squelette technique uniquement.** Conformément au
> règlement du hackathon, ce dépôt ne contient aucune logique métier liée
> au sujet avant le lancement officiel. Il fournit uniquement la base
> technique (NestJS + config de déploiement + route de santé) nécessaire
> pour valider la chaîne de déploiement à l'avance.

## Stack technique

- [NestJS](https://nestjs.com) (TypeScript, ESM)
- [pnpm](https://pnpm.io) pour la gestion des dépendances
- [Vitest](https://vitest.dev) pour les tests unitaires et e2e
- Hébergement : cPanel HODI via **Hodifly** (Passenger), voir
  [`docs/DEPLOIEMENT.md`](./docs/DEPLOIEMENT.md)

## Prérequis

- Node.js **24** (version utilisée en production sur Hodifly)
- [pnpm](https://pnpm.io/installation)

## Installation

```bash
pnpm install
```

Copier `.env.example` vers `.env` et ajuster les valeurs si besoin (voir
la liste des variables ci-dessous) :

```bash
cp .env.example .env
```

## Variables d'environnement

| Variable    | Description                                              | Obligatoire |
| ----------- | --------------------------------------------------------- | ----------- |
| `PORT`      | Port d'écoute HTTP (géré automatiquement par Passenger en prod) | Non — défaut `3000` |
| `FRONT_URL` | Origine(s) autorisée(s) en CORS (front Next.js), séparées par des virgules si plusieurs | Recommandé en prod |
| `APP_NAME`  | Nom applicatif, exposé par `/health` pour vérifier que les variables Hodifly sont bien lues | Non |

En production (Hodifly), ces variables se définissent dans l'interface
Hodifly, pas dans un fichier `.env` — voir
[`docs/DEPLOIEMENT.md`](./docs/DEPLOIEMENT.md) pour le détail.

## Lancer le projet

```bash
# développement, avec rechargement à chaud
pnpm run start:dev

# développement, sans rechargement
pnpm run start

# build + démarrage "à la Passenger" (identique à ce que fait Hodifly)
pnpm run build
node server.js
```

Une fois lancé, vérifier que tout fonctionne :

```bash
curl http://localhost:3000/health
```

## Tests

```bash
# tests unitaires
pnpm run test

# tests e2e
pnpm run test:e2e

# couverture
pnpm run test:cov
```

## Route de santé

`GET /health` renvoie l'état du serveur, la version de Node et la
variable `APP_NAME` (pour confirmer que les variables d'environnement
Hodifly arrivent bien jusqu'à l'application) — sans jamais exposer de
secret :

```json
{
  "status": "ok",
  "date": "2026-10-03T12:00:00.000Z",
  "nodeVersion": "v24.0.0",
  "appName": "api-lunar-devs"
}
```

## Déploiement

Le déploiement se fait via Hodifly (intégré au cPanel HODI) : un push sur
GitHub déclenche un build (`npm run build`) puis un lancement automatique
via Passenger (`server.js` à la racine). La configuration complète
(paramètres Hodifly, variables d'environnement, CORS, stockage persistant,
procédure de test) est documentée dans
[`docs/DEPLOIEMENT.md`](./docs/DEPLOIEMENT.md).

## Structure du projet

```
src/
  main.ts               # bootstrap Nest, CORS, port
  app.module.ts          # module racine
  health.controller.ts   # route GET /health
  app.controller.ts      # route GET / (placeholder)
  app.service.ts
server.js                 # point d'entrée Passenger, charge dist/main.js
docs/DEPLOIEMENT.md        # documentation d'hébergement et de déploiement
.env.example                # variables d'environnement attendues
```

## Équipe

Lunar Devs — Webcup Comores 2026.

## Licence

Projet privé (`UNLICENSED`), développé dans le cadre du hackathon.
