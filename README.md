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
- [TypeORM](https://typeorm.io) + [`mysql2`](https://github.com/sidorares/node-mysql2)
  (pilote 100% JS, pas de code natif) pour MySQL
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
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Connexion MySQL, en variables séparées (pas d'URL, pour éviter les soucis d'encodage du mot de passe) | Oui, pour que `/health/db` fonctionne |

En production (Hodifly), ces variables se définissent dans l'interface
Hodifly, pas dans un fichier `.env` — voir
[`docs/DEPLOIEMENT.md`](./docs/DEPLOIEMENT.md) pour le détail, y compris
comment lancer un MySQL local avec Docker pour tester.

## Lancer le projet

```bash
# développement, avec rechargement à chaud
pnpm run start:dev

# développement, sans rechargement
pnpm run start

# build + démarrage "à la Passenger" (identique à ce que fait Hodifly)
pnpm run build
node -e "require('./server.cjs')"
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

`GET /health/db` vérifie en plus la base MySQL : insère une ligne dans
`health_check`, puis renvoie le nombre total de lignes et la date de la
dernière. Cette route répond `503` avec un message générique si la base
est indisponible — mais `GET /health` continue de fonctionner dans tous
les cas, puisqu'elle ne dépend jamais de la base. Voir §6 de
[`docs/DEPLOIEMENT.md`](./docs/DEPLOIEMENT.md) pour le détail et comment
tester en local avec un MySQL Docker.

## Migrations

Le schéma est géré uniquement par migrations TypeORM (`synchronize:
false`). Comme il n'y a pas d'accès SSH sur Hodifly, elles s'appliquent
automatiquement à chaque démarrage de l'app (`migrationsRun: true`). Pour
en créer une nouvelle en développement :

```bash
pnpm run migration:generate src/database/migrations/NomDeLaMigration
pnpm run migration:run        # optionnel : les applique localement tout de suite
pnpm run migration:revert     # annule la dernière si besoin
```

## Déploiement

Le déploiement se fait via Hodifly (intégré au cPanel HODI) : un push sur
GitHub déclenche un build (`npm run build`) puis un lancement automatique
via Passenger (`server.cjs` à la racine — voir §7 "Piège Passenger + ESM"
de la doc de déploiement). La configuration complète
(paramètres Hodifly, variables d'environnement, CORS, stockage persistant,
procédure de test) est documentée dans
[`docs/DEPLOIEMENT.md`](./docs/DEPLOIEMENT.md).

## Structure du projet

```
src/
  main.ts                           # bootstrap Nest, CORS, port, connexion DB manuelle
  app.module.ts                      # module racine, config TypeORM
  health.controller.ts               # routes GET /health et GET /health/db
  app.controller.ts                  # route GET / (placeholder)
  app.service.ts
  database/
    data-source.ts                   # config MySQL partagée (app + CLI TypeORM)
    entities/health-check.entity.ts  # entité de test HealthCheck
    migrations/                      # migrations TypeORM (exécutées auto au démarrage)
server.cjs                 # point d'entrée Passenger (CommonJS), charge dist/main.js
docs/DEPLOIEMENT.md        # documentation d'hébergement et de déploiement
.env.example                # variables d'environnement attendues
```

## Équipe

Lunar Devs — Webcup Comores 2026.

## Licence

Projet privé (`UNLICENSED`), développé dans le cadre du hackathon.
