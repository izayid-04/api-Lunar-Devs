# API — contrat des routes

Documentation précise de chaque route de l'API `api-lunar-devs`, à jour
après chaque bloc. Sert de contrat entre le backend et l'agent front —
toute réponse décrite ici est garantie tant que ce document n'a pas été
mis à jour en conséquence.

Base URL :
- Production : `https://api.lunardevs.lescomores.webcup.hodi.cloud`
- Local : `http://localhost:3000` (ou le port défini par `PORT`)

Authentification : `Authorization: Bearer <accessToken>` (JWT obtenu via
`POST /auth/login`). Les routes publiques n'en ont pas besoin.

Erreurs : toutes les erreurs suivent le format standard NestJS :
```json
{ "statusCode": 400, "error": "Bad Request", "message": "..." }
```
`message` est une chaîne, ou un tableau de chaînes pour les erreurs de
validation (`400`, une par champ invalide).

---

## Santé

### `GET /health`
- **Rôle** : public.
- **Réponse `200`** : toujours, même si la base est indisponible.
  ```json
  { "status": "ok", "date": "2026-10-03T12:00:00.000Z", "nodeVersion": "v24.21.0", "appName": "api-lunar-devs" }
  ```

### `GET /health/db`
- **Rôle** : public.
- **Réponse `200`** si la base répond (insère une ligne de test) :
  ```json
  { "status": "ok", "totalRows": 6, "lastCreatedAt": "2026-10-03T12:00:00.000Z" }
  ```
- **Réponse `503`** si la base est indisponible :
  ```json
  { "status": "error", "message": "Database unavailable" }
  ```

---

## Authentification (Bloc 1)

### `POST /auth/register`
- **Rôle** : public.
- **Corps** :
  ```json
  { "email": "a@example.com", "password": "MotDePasse123", "firstName": "A", "lastName": "B" }
  ```
  Toute propriété en plus (ex. `role`) est **rejetée** avec `400`.
- **Réponse `201`** : le compte créé, **toujours** `role: "citizen"`.
  ```json
  { "id": "1", "email": "a@example.com", "firstName": "A", "lastName": "B", "role": "citizen", "createdAt": "..." }
  ```
- **`409`** si l'email est déjà utilisé.
- **`400`** si validation échoue (email invalide, mot de passe < 8 caractères, etc.).

### `POST /auth/login`
- **Rôle** : public.
- **Corps** : `{ "email": "...", "password": "..." }`
- **Réponse `200`** : `{ "accessToken": "eyJ..." }` — JWT valide 1 jour.
- **`401`** si identifiants invalides (message générique, ne révèle pas si l'email existe).

### `GET /me`
- **Rôle** : connecté (tout rôle).
- **Réponse `200`** :
  ```json
  { "id": "1", "email": "a@example.com", "firstName": "A", "lastName": "B", "role": "citizen", "createdAt": "..." }
  ```
- **`401`** sans token ou token invalide/expiré.

### `GET /agent/ping`
- **Rôle** : `agent`, `admin`.
- **Réponse `200`** : `{ "status": "ok", "scope": "agent" }`
- **`403`** pour un `citizen`. **`401`** sans token.

### `GET /admin/ping`
- **Rôle** : `admin`.
- **Réponse `200`** : `{ "status": "ok", "scope": "admin" }`
- **`403`** pour `citizen` et `agent`. **`401`** sans token.

---

## Messages des habitants (Bloc 2 — D04, F22)

Un habitant envoie un message à un service de la ville ; un agent/admin
le traite en changeant son statut (`nouveau` → `en_cours` → `traite`).

### `POST /messages`
- **Rôle** : `citizen`.
- **Corps** :
  ```json
  { "subject": "Lampadaire cassé", "body": "Le lampadaire devant le 12 rue des Etoiles ne fonctionne plus.", "category": "eclairage" }
  ```
  - `subject` : 3 à 150 caractères.
  - `body` : 10 à 5000 caractères.
  - `category` : texte libre, 1 à 100 caractères (pas de liste fermée imposée par l'API).
- **Réponse `201`** — la référence (`reference`) sert de confirmation d'envoi à afficher à l'habitant :
  ```json
  {
    "id": 1,
    "reference": "NT-0001",
    "subject": "Lampadaire cassé",
    "body": "...",
    "category": "eclairage",
    "status": "nouveau",
    "createdAt": "2026-10-03T12:00:00.000Z",
    "updatedAt": "2026-10-03T12:00:00.000Z"
  }
  ```
- **`403`** pour `agent`/`admin` (cette route est réservée aux citoyens). **`400`** si validation échoue.

### `GET /messages/mine`
- **Rôle** : `citizen`.
- **Réponse `200`** : tableau des messages de l'habitant connecté, **plus récents d'abord** — même forme d'objet que ci-dessus, sans `author` (c'est déjà l'utilisateur connecté).
  ```json
  [ { "id": 2, "reference": "NT-0002", "subject": "...", "body": "...", "category": "...", "status": "nouveau", "createdAt": "...", "updatedAt": "..." }, ... ]
  ```

### `GET /agent/messages?status=`
- **Rôle** : `agent`, `admin`.
- **Query param `status`** (optionnel) : un parmi `nouveau`, `en_cours`, `traite`. Absent = tous les messages.
- **Réponse `200`** :
  ```json
  {
    "messages": [
      {
        "id": 1, "reference": "NT-0001", "subject": "...", "body": "...", "category": "...",
        "status": "en_cours", "createdAt": "...", "updatedAt": "...",
        "author": { "id": "3", "firstName": "Mo", "lastName": "Said", "email": "mo@example.com" }
      }
    ],
    "counts": { "nouveau": 1, "en_cours": 1, "traite": 0 }
  }
  ```
  - `messages` est trié par `createdAt` décroissant, filtré par `status` si fourni.
  - **`counts` porte toujours sur TOUS les messages**, indépendamment du filtre `status` appliqué à `messages` — pensé pour afficher un badge par onglet de statut dans l'UI pendant qu'une liste filtrée est affichée.
- **`400`** si `status` a une valeur hors enum.

### `PATCH /agent/messages/:id/status`
- **Rôle** : `agent`, `admin`.
- **Corps** : `{ "status": "en_cours" }` (une valeur parmi `nouveau`, `en_cours`, `traite`).
- **Réponse `200`** : le message mis à jour (même forme que `POST /messages`, sans `author`).
- **`404`** si l'id n'existe pas. **`400`** si `status` invalide.

---

## Espace agents + API Webcup (Bloc 3 — D19)

### `GET /agent/webcup/requests`
- **Rôle** : `agent`, `admin`.
- Proxy vers `https://24h.webcup.fr/wp-json/webcup/v1/requests` (en-tête
  `X-Webcup-Api-Key`, clé jamais exposée). **Cache mémoire 60 s** côté
  API : plusieurs appels rapprochés ne déclenchent qu'un seul appel
  upstream.
- **Réponse `200`** — `data` est le JSON **brut** renvoyé par l'API
  Webcup, passé tel quel (ce backend ne le reformate pas ; sa forme
  exacte — session, vague en cours, minutes avant la prochaine,
  demandes — dépend de ce que l'API Webcup renvoie réellement) :
  ```json
  {
    "data": { "...": "tel que renvoyé par l'API Webcup" },
    "cache": { "hit": false, "ageSeconds": 0 }
  }
  ```
  - `cache.hit: true` = réponse servie depuis le cache mémoire (fraîche
    de moins de 60 s, **ou** cache périmé mais servi quand même parce
    que l'appel upstream a échoué — voir ci-dessous).
  - `cache.hit: false` = appel upstream réussi à l'instant.
- **`503`** si l'API Webcup échoue **et** qu'aucun cache n'est
  disponible (ex. tout premier appel après démarrage, upstream down) :
  ```json
  { "message": "Webcup API unavailable", "error": "Service Unavailable", "statusCode": 503 }
  ```
- Si l'API Webcup échoue mais qu'un cache (même périmé) existe, il est
  renvoyé à la place d'une erreur — pas de `503` dans ce cas.

### `GET /agent/dashboard`
- **Rôle** : `agent`, `admin`.
- **Réponse `200`** :
  ```json
  {
    "citizensCount": 42,
    "messagesByStatus": { "nouveau": 3, "en_cours": 2, "traite": 7 },
    "recentMessages": [
      {
        "id": 12, "reference": "NT-0012", "subject": "...", "body": "...", "category": "...",
        "status": "nouveau", "createdAt": "...", "updatedAt": "...",
        "author": { "id": "5", "firstName": "...", "lastName": "...", "email": "..." }
      }
    ]
  }
  ```
  - `citizensCount` : nombre total de comptes `citizen`.
  - `messagesByStatus` : identique aux `counts` de `GET /agent/messages`.
  - `recentMessages` : les 5 messages les plus récents, tous statuts
    confondus, avec l'auteur.

## Contenu de la ville (Bloc 4 — D05, D06)

### `GET /services`
- **Rôle** : public.
- **Réponse `200`** : tableau de tous les services municipaux, triés par
  quartier puis par nom.
  ```json
  [
    {
      "id": 1, "slug": "mairie-de-nova-terra", "name": "Mairie de Nova Terra",
      "description": "...", "details": "...", "contact": "...", "horaires": "...",
      "district": "Centre-Ville"
    }
  ]
  ```

### `GET /services/:slug`
- **Rôle** : public.
- **Réponse `200`** : même forme qu'un élément de `GET /services`.
- **`404`** si le `slug` n'existe pas.

### `GET /announcements`
- **Rôle** : public.
- **Réponse `200`** : tableau des annonces, **plus récentes d'abord**
  (`publishedAt` décroissant). L'auteur n'est **jamais** exposé
  publiquement (suivi en interne uniquement).
  ```json
  [ { "id": 1, "title": "...", "body": "...", "category": "...", "publishedAt": "2026-10-03T12:00:00.000Z" } ]
  ```

### `GET /announcements/:id`
- **Rôle** : public.
- **Réponse `200`** : même forme qu'un élément de `GET /announcements`.
- **`404`** si l'id n'existe pas.

### `POST /announcements`
- **Rôle** : `agent`, `admin`.
- **Corps** : `{ "title": "...", "body": "...", "category": "..." }`
- **Réponse `201`** : l'annonce créée, `publishedAt` fixé automatiquement
  à l'instant de création (non modifiable par le client).
- **`403`** pour `citizen`. **`400`** si validation échoue.

### `PATCH /announcements/:id`
- **Rôle** : `agent`, `admin`.
- **Corps** : tout ou partie de `{ "title", "body", "category" }` — les
  champs omis restent inchangés.
- **Réponse `200`** : l'annonce mise à jour.
- **`404`** si l'id n'existe pas. **`403`** pour `citizen`.

### `DELETE /announcements/:id`
- **Rôle** : `agent`, `admin`.
- **Réponse `204`** (corps vide) si la suppression réussit.
- **`404`** si l'id n'existe pas. **`403`** pour `citizen`.

## Prochains blocs

À compléter au fur et à mesure (Bloc 3 : API Webcup + dashboard agent ;
Bloc 4 : services municipaux + annonces).
