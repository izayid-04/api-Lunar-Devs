# Déploiement — Hodifly / cPanel HODI

Contexte : hackathon 24h Webcup Comores (3-4 octobre 2026), équipe Lunar Devs.
Ce document décrit l'hébergement, la configuration à saisir dans Hodifly, et
la procédure pour vérifier que tout fonctionne, côté API (ce dépôt) comme
côté front.

> Le sujet est tombé le 3 octobre 2026 : la plateforme numérique de la
> ville **Nova Terra**. Le Bloc 1 (inscription, connexion, espace
> personnel, rôles, contrôle d'accès) est implémenté — voir
> [`docs/DEMANDES.md`](./DEMANDES.md) pour le détail par demande.

## 1. Hébergement

- **cPanel HODI**, accès **SSH bloqué** : tout passe par l'interface web
  cPanel / Hodifly, pas de terminal distant.
- **10 Go de disque**, **CPU/RAM partagés** entre toutes les équipes du
  hackathon : éviter les dépendances lourdes, les gros fichiers commités, et
  les processus qui consomment beaucoup de mémoire/CPU en continu.
- Deux domaines séparés :
  - API (ce dépôt) : `api.lunardevs.lescomores.webcup.hodi.cloud`
  - Front Next.js (dépôt séparé) : `lunardevs.lescomores.webcup.hodi.cloud`

## 2. Déploiement via Hodifly

Hodifly est intégré au cPanel : un `git push` sur GitHub déclenche un build
puis un lancement automatique de l'application.

### Configuration à saisir dans Hodifly pour ce dépôt (API)

| Paramètre              | Valeur                          |
| ----------------------- | -------------------------------- |
| Type d'application      | Application Node (Passenger)     |
| Version de Node         | 24                                |
| Commande de build       | `npm run build`                  |
| Fichier de démarrage    | `server.cjs` (à la racine du dépôt)|
| Domaine                 | `api.lunardevs.lescomores.webcup.hodi.cloud` |

`npm run build` exécute `nest build`, qui compile `src/` vers `dist/`
(configuré par `tsconfig.build.json`). `server.cjs`, à la racine, charge
ensuite `./dist/main.js` pour démarrer le serveur — c'est ce fichier que
Passenger lance. Le fichier de démarrage **doit être `server.cjs`** (pas
`server.js`) — voir §7 pour pourquoi.

L'application écoute sur `process.env.PORT` (Passenger fournit cette
variable automatiquement en production ; en local elle vaut `3000` par
défaut si elle n'est pas définie).

### Variables d'environnement

Les variables d'environnement se définissent **dans l'interface Hodifly**
(pas dans un fichier `.env` committé) et sont injectées dans
`process.env` **au build ET à l'exécution**. Aucun secret ne doit se
trouver dans Git — voir `.env.example` à la racine pour la liste des
variables attendues (sans valeurs réelles) :

- `PORT` — géré automatiquement par Passenger en production.
- `FRONT_URL` — URL(s) du front autorisée(s) en CORS (voir §3). Peut
  contenir plusieurs origines séparées par des virgules.
- `APP_NAME` — variable de test, sans valeur sensible, utilisée pour
  prouver que les variables Hodifly arrivent bien jusqu'à l'app (exposée
  par `GET /health`, voir §4).

Au fur et à mesure que le vrai projet du hackathon ajoutera des secrets
(clés API, connexions base de données, etc.), ils devront être ajoutés dans
Hodifly de la même façon, et listés (sans valeur) dans `.env.example`.

### Stockage persistant

Hodifly propose une option "Fichiers conservés entre déploiements" pour les
dossiers qui doivent survivre à un redéploiement (ex. `storage/uploads/`
pour des fichiers uploadés par les utilisateurs). À activer dès qu'un
dossier de ce type est introduit dans le projet — un déploiement normal
écrase le reste du code.

## 3. CORS

Le front Next.js (`lunardevs.lescomores.webcup.hodi.cloud`) doit pouvoir
appeler l'API sur un domaine différent (`api.lunardevs.lescomores.webcup.hodi.cloud`).
`src/main.ts` active CORS avec une règle d'origine dynamique :

- `FRONT_URL` liste **plusieurs origines, séparées par des virgules** —
  c'est la valeur par défaut dans `.env`/`.env.example` :
  `FRONT_URL=https://lunardevs.lescomores.webcup.hodi.cloud,http://localhost:3000,http://localhost:3001`.
  Pour ajouter une origine (ex. une URL Vercel plus tard) : l'ajouter
  dans cette liste (dans Hodifly en prod, dans `.env` en local), aucun
  changement de code.
- En plus de cette liste, **`http://localhost:<n'importe quel port>`
  est toujours autorisé** par le code (`src/main.ts`), même s'il n'est
  pas dans `FRONT_URL` — un filet de sécurité si jamais le port du front
  local change.
- Si `FRONT_URL` n'est pas définie du tout, toutes les origines sont
  autorisées (avertissement dans les logs) — dev uniquement ;
  `FRONT_URL` **doit** être définie dans Hodifly en production.

## 4. Route de test `GET /health`

Permet de vérifier après déploiement que le serveur tourne et que les
variables d'environnement Hodifly sont bien lues par l'app, sans jamais
exposer de secret :

```json
{
  "status": "ok",
  "date": "2026-10-03T12:00:00.000Z",
  "nodeVersion": "v24.x.x",
  "appName": "api-lunar-devs"
}
```

`appName` provient de `process.env.APP_NAME` : si elle affiche la valeur
définie dans Hodifly (et non `null`), la chaîne de variables
d'environnement fonctionne de bout en bout.

## 5. Procédure de test

### En local (avant tout push)

```bash
pnpm install        # ou npm install, selon le lockfile utilisé
npm run build        # équivalent à la commande de build Hodifly
node -e "require('./server.cjs')"        # reproduit exactement le chargement Passenger
curl http://localhost:3000/health
```

`node -e "require('./server.cjs')"` reproduit fidèlement la façon dont
Passenger démarre l'app (via `require()`, voir §7) — c'est ce qu'il faut
tester avant de pousser, pas `node server.cjs` tout seul (qui fonctionne
aussi, mais ne détecterait pas un problème de compatibilité `require()`).

Vérifier que `/health` répond `status: "ok"` et que `nodeVersion` /
`appName` correspondent à l'environnement local (`APP_NAME` peut être
défini via un `.env` copié depuis `.env.example`, ou en variable
d'environnement inline). Voir §6 pour tester en plus `/health/db` avec un
MySQL local (Docker).

### Après déploiement sur Hodifly

1. Configurer les variables d'environnement dans Hodifly (voir §2),
   notamment `APP_NAME` et `FRONT_URL`.
2. Pousser sur la branche déployée par Hodifly et attendre la fin du build.
3. Tester :

   ```bash
   curl https://api.lunardevs.lescomores.webcup.hodi.cloud/health
   ```

4. Vérifier que `appName` correspond bien à la valeur saisie dans Hodifly
   (preuve que les variables arrivent en production) et que `nodeVersion`
   correspond à Node 24.
5. Depuis le front déployé, faire un appel `fetch` vers `/health` et
   vérifier dans la console navigateur qu'aucune erreur CORS n'apparaît.

## 6. Base de données MySQL (TypeORM)

### Pourquoi ces choix

- **MySQL** (pas PostgreSQL) sur `localhost:3306`, base `lunardevs_app`,
  utilisateur `lunardevs_api` — c'est l'infrastructure fournie côté cPanel.
- Pilote **`mysql2`** (100% JavaScript, aucun code natif à compiler) : le
  serveur tourne sous **glibc 2.28**, trop ancienne pour la plupart des
  paquets avec des bindings natifs (ex. le driver `mysql` historique, ou
  certains drivers Postgres natifs). `mysql2` évite tout risque
  d'incompatibilité au déploiement.
- **Variables séparées** (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
  `DB_PASSWORD`) plutôt qu'une URL de connexion unique : un mot de passe
  contenant des caractères spéciaux (`@`, `:`, `/`, `#`...) casse le
  parsing d'une URL s'il n'est pas correctement encodé. Des variables
  séparées éliminent ce problème.
- **`synchronize: false`** : TypeORM ne modifie jamais le schéma tout
  seul en se basant sur les entités — seules les migrations explicites
  changent la base. Indispensable dès qu'on touche à une vraie base
  partagée.
- **`migrationsRun: true`** : comme il n'y a **pas d'accès SSH** pour
  lancer `typeorm migration:run` à la main sur le serveur, les migrations
  en attente s'exécutent **automatiquement à chaque démarrage de
  l'application** (donc à chaque déploiement Hodifly, puisque Passenger
  redémarre le process). C'est la seule façon de faire évoluer le schéma
  en production dans ce contexte.

### Résilience : la base ne doit jamais empêcher l'app de démarrer

`TypeOrmModule.forRoot()` est configuré avec `manualInitialization: true`
(voir `src/app.module.ts`) : Nest enregistre le `DataSource` sans tenter
de se connecter pendant le démarrage du module. C'est `src/main.ts` qui
appelle ensuite `dataSource.initialize()` explicitement, dans un
`try/catch` :

- Si la connexion réussit → les migrations en attente s'appliquent
  (`migrationsRun: true`), et `GET /health/db` fonctionne.
- Si la connexion échoue (base indisponible, identifiants invalides,
  etc.) → l'erreur est journalisée côté serveur, **mais l'application
  démarre quand même** et continue de répondre sur `GET /health` (qui ne
  dépend jamais de la base). `GET /health/db` répondra alors `503` avec
  un message générique tant que la base reste injoignable.

Sans ce découpage, une base de données temporairement indisponible au
moment précis du déploiement ferait planter tout le process Node — donc
toute l'API, y compris la route de santé de base.

### Variables d'environnement à saisir dans Hodifly

En plus de `PORT`, `FRONT_URL`, `APP_NAME` (voir §2) :

| Variable      | Valeur (production)  |
| ------------- | --------------------- |
| `DB_HOST`     | `localhost`            |
| `DB_PORT`     | `3306`                 |
| `DB_NAME`     | `lunardevs_app`        |
| `DB_USER`     | `lunardevs_api`        |
| `DB_PASSWORD` | (mot de passe réel, saisi uniquement dans Hodifly — jamais dans Git) |

### Entité et migration de test

- `src/database/entities/health-check.entity.ts` — entité `HealthCheck`
  (table `health_check`) : `id` auto-incrémenté, `createdAt`.
- `src/database/migrations/` — une migration qui crée la table
  `health_check`. Compilée automatiquement par `nest build` vers
  `dist/database/migrations/`, d'où `migrationsRun: true` l'applique au
  démarrage.
- `src/database/data-source.ts` — config de connexion partagée entre le
  CLI TypeORM (migrations) et l'app Nest (`src/app.module.ts`), pour
  n'avoir qu'un seul endroit à modifier.

Pour ajouter une future migration (plus tard, une fois le hackathon
lancé) :

```bash
pnpm run migration:generate src/database/migrations/NomDeLaMigration
pnpm run migration:run        # applique localement, optionnel (l'app le fait aussi au démarrage)
pnpm run migration:revert     # annule la dernière migration si besoin
```

### Route `GET /health/db`

Insère une ligne dans `health_check`, puis renvoie le nombre total de
lignes et la date de la dernière — pour prouver que l'app écrit et lit
bien dans MySQL de bout en bout :

```json
{
  "status": "ok",
  "totalRows": 3,
  "lastCreatedAt": "2026-10-03T12:00:00.000Z"
}
```

En cas d'échec (base injoignable, erreur de requête), réponse `503` :

```json
{
  "status": "error",
  "message": "Database unavailable"
}
```

Aucun identifiant, mot de passe ou détail d'erreur brut n'est jamais
renvoyé au client — seuls des messages génériques. Les erreurs détaillées
restent dans les logs serveur.

> ⚠️ Chaque appel à `/health/db` insère une ligne. Pratique pour un test
> ponctuel, à éviter en boucle/monitoring automatisé répété — l'espace
> disque est limité et partagé entre équipes (voir §1).

### Tester en local avec un MySQL dans Docker

Le plus simple, sans rien installer sur la machine :

```bash
docker run -d --name lunardevs-mysql-test \
  -e MYSQL_ROOT_PASSWORD=rootpass \
  -e MYSQL_DATABASE=lunardevs_app \
  -e MYSQL_USER=lunardevs_api \
  -e MYSQL_PASSWORD=apipass \
  -p 3307:3306 \
  mysql:8.0
```

(port hôte `3307` pour ne pas entrer en conflit avec un éventuel MySQL
déjà installé localement sur le port 3306 par défaut — adapter si besoin).

Puis dans `.env` (copié depuis `.env.example`) :

```
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=lunardevs_app
DB_USER=lunardevs_api
DB_PASSWORD=apipass
```

Ensuite, procédure habituelle (voir §5) :

```bash
pnpm install
pnpm run build
node -e "require('./server.cjs')"
curl http://localhost:3000/health       # doit répondre, indépendamment de la base
curl http://localhost:3000/health/db    # doit insérer une ligne et répondre "ok"
```

Pour arrêter/supprimer le conteneur de test une fois fini :

```bash
docker stop lunardevs-mysql-test && docker rm lunardevs-mysql-test
```

## 7. Piège Passenger + ESM

Ce projet est en **ESM** (`"type": "module"` dans `package.json`), et
`src/main.ts` démarre l'app avec un **top-level await**
(`await bootstrap();`) — ce qui se retrouve tel quel dans le fichier
compilé `dist/main.js`.

Passenger, lui, démarre le fichier de démarrage avec **`require()`**
(via son `node-loader.js` interne), pas avec `import()`. Or `require()`
ne peut pas charger un module ESM qui contient un top-level await : Node
lève alors :

```
Error [ERR_REQUIRE_ASYNC_MODULE]: require() cannot be used on an ESM graph
with top-level await.
```

Le déploiement réussit (le build passe), mais l'application ne démarre
jamais — c'est uniquement visible dans les logs Passenger.

**Solution** : le fichier de démarrage ne doit jamais être un fichier ESM
avec top-level await. `server.cjs`, à la racine, est volontairement en
**CommonJS** (extension `.cjs`, qui force CommonJS même si
`package.json` déclare `"type": "module"`) et ne contient **aucun
top-level await** — les fichiers CommonJS ne peuvent d'ailleurs pas en
avoir, c'est une erreur de syntaxe. Il utilise `import()` dynamique
(et non `await import()` en haut de fichier) pour charger `dist/main.js` :

```js
import('./dist/main.js').catch((err) => {
  console.error('Failed to start the application:', err);
  process.exit(1);
});
```

`import()` dynamique — contrairement à `require()` — sait très bien
charger un module ESM avec top-level await, même depuis un fichier
CommonJS. C'est cette asymétrie entre `require()` et `import()` qui est
au cœur du problème.

**Points de vigilance** :

- Le fichier de démarrage configuré dans Hodifly doit être `server.cjs`,
  pas `server.js`.
- Ne jamais remettre de top-level `await` directement dans `server.cjs`
  (impossible en CommonJS de toute façon — Node refusera de le parser).
- Pour tester en local exactement comme Passenger le fait, utiliser
  `node -e "require('./server.cjs')"` (voir §5), pas juste
  `node server.cjs`.
- Si le fichier de build change de nom ou d'emplacement (ex. évolution de
  `tsconfig.build.json` ou de `nest-cli.json`), mettre à jour le chemin
  importé dans `server.cjs` en conséquence.

## 8. Authentification et rôles (Bloc 1)

### Modèle

- Entité `User` (`src/users/entities/user.entity.ts`, table `users`) :
  `id`, `email` (unique), `passwordHash`, `firstName`, `lastName`, `role`
  (enum MySQL `citizen` / `agent` / `admin`, défaut `citizen`),
  `createdAt`. Migration : `src/database/migrations/*-CreateUsers.ts`.
- Mots de passe hashés avec **`bcryptjs`** (implémentation 100% JS de
  bcrypt, donc pas de code natif à compiler — même contrainte glibc 2.28
  que pour `mysql2`, voir §6). Ne jamais utiliser le paquet `bcrypt`
  natif sur ce serveur.

### Endpoints

| Route | Rôle requis | Description |
| ----- | ----------- | ----------- |
| `POST /auth/register` | public | Crée un compte **toujours `citizen`** — le champ `role` n'existe pas dans le DTO, et `ValidationPipe({ forbidNonWhitelisted: true })` (voir `src/main.ts`) rejette avec `400` toute requête qui tente d'en envoyer un. |
| `POST /auth/login` | public | Vérifie le mot de passe (`bcrypt.compare`), renvoie `{ accessToken }` (JWT signé avec `JWT_SECRET`, 1 jour de validité). |
| `GET /me` | connecté (tout rôle) | Profil de l'utilisateur authentifié par le JWT (jamais `passwordHash`). |
| `GET /agent/ping` | `agent`, `admin` | Démo de route protégée par rôle. |
| `GET /admin/ping` | `admin` | Démo de route protégée par rôle. |

Toutes les entrées (`register`, `login`) sont validées avec
`class-validator` (email valide, mot de passe ≥ 8 caractères, etc.) ; une
requête invalide renvoie `400` avant d'atteindre la base.

### Contrôle d'accès

- `JwtAuthGuard` (`src/auth/jwt-auth.guard.ts`) : vérifie l'en-tête
  `Authorization: Bearer <token>` avec `JwtService` (secret
  `JWT_SECRET`) et attache l'utilisateur décodé à la requête. Sans
  token valide → `401`.
- `@Roles(...)` + `RolesGuard` (`src/auth/roles.decorator.ts`,
  `src/auth/roles.guard.ts`) : à poser après `JwtAuthGuard` sur un
  contrôleur ou une méthode. Si le rôle de l'utilisateur authentifié
  n'est pas dans la liste → `403`.
- `AuthModule` est `@Global()` (et son `JwtModule` enregistré avec
  `global: true`) : n'importe quel futur module métier (blocs suivants
  du hackathon) peut utiliser `@UseGuards(JwtAuthGuard, RolesGuard)` +
  `@Roles(UserRole.XXX)` sans réimporter `AuthModule`.

### Comptes de démonstration (jury)

Au démarrage, `seedDemoUsers()` (`src/database/seed.ts`) crée — **de
façon idempotente** (ne recrée jamais un compte existant, ne touche
jamais son mot de passe) — un compte `agent` et un compte `admin` à
partir de ces variables d'environnement :

| Variable | Rôle créé |
| -------- | --------- |
| `DEMO_AGENT_EMAIL` / `DEMO_AGENT_PASSWORD` | `agent` |
| `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` | `admin` |

Si une paire n'est pas définie, ce compte est simplement ignoré (log
d'avertissement, pas de crash). **À définir dans Hodifly avant la
démo/le rendu** pour que le jury ait des comptes `agent` et `admin`
prêts à l'emploi sans avoir à les créer à la main (`/auth/register` ne
crée que des `citizen`).

### Variable supplémentaire à saisir dans Hodifly

En plus des variables listées en §2 et §6 :

| Variable | Valeur |
| -------- | ------ |
| `JWT_SECRET` | Une valeur longue et aléatoire — **jamais** la même qu'en dev. Quiconque la connaît peut forger un token admin valide. À générer avec : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` (pas besoin d'aller en chercher un ailleurs). |
| `DEMO_AGENT_EMAIL`, `DEMO_AGENT_PASSWORD` | Identifiants du compte agent de démo pour le jury. |
| `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD` | Identifiants du compte admin de démo pour le jury. |

### Tester les 3 rôles en local

```bash
# 1. Inscription (toujours citizen)
curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"citoyen@example.com","password":"MotDePasse123","firstName":"A","lastName":"B"}'

# 2. Connexion (citizen, puis avec les comptes agent/admin de démo)
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"citoyen@example.com","password":"MotDePasse123"}'
# → { "accessToken": "..." }

# 3. Accès refusé (citizen sur une route agent/admin → 403)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/agent/ping \
  -H "Authorization: Bearer <token-citizen>"

# 4. Accès autorisé (agent sur /agent/ping, admin sur /agent/ping et /admin/ping)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/agent/ping \
  -H "Authorization: Bearer <token-agent>"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/ping \
  -H "Authorization: Bearer <token-admin>"
```

## 9. Rappel — règlement du hackathon

Le sujet a été révélé le 3 octobre 2026 ; le développement de
fonctionnalités métier (blocs de demandes) est désormais autorisé et en
cours. Voir [`docs/DEMANDES.md`](./DEMANDES.md) pour la correspondance
entre chaque demande du sujet et ce qui la satisfait dans le code.
