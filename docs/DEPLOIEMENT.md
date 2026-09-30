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
| Fichier de démarrage    | `server.js` (à la racine du dépôt)|
| Domaine                 | `api.lunardevs.lescomores.webcup.hodi.cloud` |

`npm run build` exécute `nest build`, qui compile `src/` vers `dist/`
(configuré par `tsconfig.build.json`). `server.js`, à la racine, importe
ensuite `./dist/main.js` pour démarrer le serveur — c'est ce fichier que
Passenger lance avec `node server.js`.

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
node server.js        # équivalent au démarrage Passenger
curl http://localhost:3000/health
```

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

## 6. Rappel — pas de logique métier avant le lancement

Ce dépôt doit rester un squelette technique jusqu'au démarrage officiel du
hackathon (3 octobre 2026). Toute fonctionnalité liée au sujet du
hackathon doit être développée **après** le lancement, conformément au
règlement.
