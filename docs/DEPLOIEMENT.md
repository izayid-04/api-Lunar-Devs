# Déploiement — Hodifly / cPanel HODI

Contexte : hackathon 24h Webcup Comores (3-4 octobre 2026), équipe Lunar Devs.
Ce document décrit l'hébergement, la configuration à saisir dans Hodifly, et
la procédure pour vérifier que tout fonctionne, côté API (ce dépôt) comme
côté front.

> ⚠️ Ce dépôt ne contient volontairement **aucune logique métier** avant le
> lancement du hackathon (règlement). Il ne contient que le squelette
> technique (NestJS + Passenger + route `/health`) nécessaire pour valider
> la chaîne de déploiement à l'avance.

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
`src/main.ts` active CORS pour l'origine définie par `FRONT_URL` :

- Si `FRONT_URL` est définie, seules cette (ou ces, séparées par des
  virgules) origine(s) sont autorisées.
- Si elle n'est pas définie (ex. run local rapide sans `.env`), toutes les
  origines sont autorisées avec un avertissement dans les logs — pratique
  en dev, mais `FRONT_URL` **doit** être définie dans Hodifly en
  production.

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
d'environnement inline).

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

## 8. Rappel — pas de logique métier avant le lancement

Ce dépôt doit rester un squelette technique jusqu'au démarrage officiel du
hackathon (3 octobre 2026). Toute fonctionnalité liée au sujet du
hackathon doit être développée **après** le lancement, conformément au
règlement.
