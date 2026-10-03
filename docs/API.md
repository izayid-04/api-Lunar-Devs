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
- **Rôle** : public (rate-limited à 10 req/min par IP).
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
- **`429`** si la limite de débit est dépassée.

### `POST /auth/login`
- **Rôle** : public (rate-limited à 15 req/min par IP).
- **Corps** : `{ "email": "...", "password": "..." }`
- **Réponse `200`** : `{ "accessToken": "eyJ..." }` — JWT valide 1 jour.
- **`401`** si identifiants invalides (message générique). Chaque échec est comptabilisé.
- **`403`** si le compte est verrouillé (après 5 tentatives infructueuses consécutives, verrouillé pendant 15 minutes) :
  ```json
  {
    "statusCode": 403,
    "error": "Forbidden",
    "message": "Compte temporairement verrouillé suite à 5 tentatives infructueuses. Déverrouillage prévu à 2026-10-03T13:30:00.000Z.",
    "lockedUntil": "2026-10-03T13:30:00.000Z"
  }
  ```
- **`429`** si la limite de débit est dépassée.

### `GET /me/security` (F37)
- **Rôle** : connecté (tout rôle).
- **Réponse `200`** : audit de sécurité du citoyen connecté (dernière connexion réussie, échecs récents, historique des 10 dernières tentatives) :
  ```json
  {
    "lastLoginAt": "2026-10-03T12:00:00.000Z",
    "lastLoginIp": "192.168.1.1",
    "recentFailures": [
      { "id": 14, "ip": "192.168.1.1", "date": "2026-10-03T11:58:00.000Z" }
    ],
    "history": [
      { "id": 15, "ip": "192.168.1.1", "success": true, "date": "2026-10-03T12:00:00.000Z" }
    ]
  }
  ```

### `GET /agent/security/targeted-accounts` (F37)
- **Rôle** : `agent`, `admin`.
- **Réponse `200`** : tableau des comptes ciblés par des tentatives échouées sur les dernières 24 heures :
  ```json
  [
    {
      "email": "victim@example.com",
      "failedAttemptsCount": 6,
      "lastFailedAt": "2026-10-03T12:00:00.000Z"
    }
  ]
  ```
- **`403`** pour `citizen`.


### `GET /me`
- **Rôle** : connecté (tout rôle).
- **Réponse `200`** :
  ```json
  {
    "id": "1", "email": "a@example.com", "firstName": "A", "lastName": "B", "role": "citizen",
    "district": "Port Stellaire", "preferredLanguage": "fr", "isVulnerable": false, "profileCompleted": true,
    "createdAt": "..."
  }
  ```
  `district`/`preferredLanguage` sont `null` et `profileCompleted: false` tant que le profil n'a pas été complété.
- **`401`** sans token ou token invalide/expiré.

### `PATCH /me`
- **Rôle** : connecté (tout rôle).
- **Corps** — tous les champs sont optionnels, seuls ceux fournis sont modifiés :
  ```json
  { "district": "Port Stellaire", "preferredLanguage": "fr", "isVulnerable": true }
  ```
  - `district` : une valeur parmi `Centre-Ville`, `Port Stellaire`, `Quartier des Dunes`, `Hauts de Nova`, `Faubourg Est` (mêmes quartiers que `GET /services`). **`400`** si une autre valeur est envoyée.
  - `preferredLanguage` : texte libre (code ou nom de langue), 50 caractères max.
  - `isVulnerable` : booléen.
- **Réponse `200`** : le profil mis à jour (même forme que `GET /me`).
  `profileCompleted` passe automatiquement à `true` dès que `district` **et** `preferredLanguage` sont tous les deux renseignés — ce champ n'est jamais réglable directement par le client.

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
  quartier puis par nom, incluant l'état de disponibilité en temps réel (`availability`, `availabilityMessage`, `availableAgainAt`, `alternative`).
  ```json
  [
    {
      "id": 1, "slug": "mairie-de-nova-terra", "name": "Mairie de Nova Terra",
      "description": "...", "details": "...", "contact": "...", "horaires": "...",
      "district": "Centre-Ville",
      "availability": "incident",
      "availabilityMessage": "Panne de climatisation centrale",
      "availableAgainAt": "2026-10-04T08:00:00.000Z",
      "alternative": "Utiliser le commissariat central pour les urgences"
    }
  ]
  ```

### `GET /services/:slug`
- **Rôle** : public.
- **Réponse `200`** : même forme qu'un élément de `GET /services`.
- **`404`** si le `slug` n'existe pas.

### `PATCH /services/:idOrSlug/availability` (F38)
- **Rôle** : `agent`, `admin`.
- **Corps** :
  ```json
  {
    "availability": "incident",
    "availabilityMessage": "Panne technique temporaire",
    "availableAgainAt": "2026-10-04T08:00:00.000Z",
    "alternative": "Contacter le standard téléphonique"
  }
  ```
  - `availability` : une valeur parmi `disponible`, `maintenance`, `incident`.
  - Autres champs optionnels.
- **Réponse `200`** : le service mis à jour. **`404`** si introuvable. **`403`** pour `citizen`.

---

## Rendez-vous municipaux (F39, F40)

### `GET /appointments/slots?service=:slugOrId`
- **Rôle** : public / connecté.
- **Réponse `200`** : tableau des créneaux disponibles pour le service demandé sur les prochains jours (`startsAt > now` et `isAvailable: true`), triés par date croissante.

### `POST /appointments/book/:slotId`
- **Rôle** : `citizen`.
- **Corps** :
  ```json
  {
    "reason": "Renouvellement pièce d'identité",
    "requiredDocuments": "Photos d'identité, justificatif de domicile"
  }
  ```
- **Réponse `201`** : confirmation du rendez-vous avec date, heure, lieu, agent assigné, service et documents à préparer.
- **`409`** si le créneau vient d'être réservé par un autre utilisateur (gestion de concurrence).
- **`404`** si le créneau n'existe pas.

### `GET /appointments/mine`
- **Rôle** : `citizen`.
- **Réponse `200`** : tableau des rendez-vous de l'habitant connecté, plus récents d'abord, avec statut (`confirme` ou `annule`).

### `PATCH /appointments/:id/cancel`
- **Rôle** : `citizen` (propriétaire du RDV).
- **Réponse `200`** : rendez-vous passé en statut `annule`, libérant automatiquement le créneau horaire (`isAvailable: true`).

### `GET /appointments/:id/ics`
- **Rôle** : connecté (le citoyen propriétaire du rendez-vous, ou un `agent` / `admin`).
- **Sécurité** :
  - **`401`** si aucun jeton JWT n'est fourni.
  - **`404`** si le rendez-vous n'existe pas ou s'il appartient à un autre citoyen (ne révèle pas l'existence du rendez-vous d'un tiers).
- **Consigne frontend** : cette route étant protégée par authentification Bearer, le front doit télécharger le fichier via un appel `fetch(...)` avec l'en-tête `Authorization: Bearer <token>`, puis déclencher le téléchargement du blob côté client (ne pas utiliser un simple lien `<a href="...">` direct).
- **Réponse `200`** : fichier calendrier au format standard iCalendar (`text/calendar; charset=utf-8`), avec en-tête `Content-Disposition: attachment; filename="rendez-vous-:id.ics"`.

### `GET /agent/appointments?serviceId=`
- **Rôle** : `agent`, `admin`.
- **Query param `serviceId`** (optionnel) : filtre par ID de service.
- **Réponse `200`** : tableau des rendez-vous avec informations du citoyen et du créneau.


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
- **Corps** : `{ "title": "...", "body": "...", "category": "...", "isImportant": true }` (`isImportant` optionnel, défaut `false`).
- **Réponse `201`** : l'annonce créée. Si `isImportant` est `true`, une notification est automatiquement générée pour tous les citoyens.
- **`403`** pour `citizen`. **`400`** si validation échoue.

### `PATCH /announcements/:id`
- **Rôle** : `agent`, `admin`.
- **Corps** : tout ou partie de `{ "title", "body", "category", "isImportant" }` — les champs omis restent inchangés.
- **Réponse `200`** : l'annonce mise à jour.
- **`404`** si l'id n'existe pas. **`403`** pour `citizen`.

### `DELETE /announcements/:id`
- **Rôle** : `agent`, `admin`.
- **Réponse `204`** (corps vide) si la suppression réussit.
- **`404`** si l'id n'existe pas. **`403`** pour `citizen`.

---

## Alertes municipales (D18, F29, F30, F31)

### `GET /alerts/active`
- **Rôle** : public (avec personnalisation optionnelle si Bearer token présent).
- **Comportement** :
  - Visiteur non connecté : reçoit les alertes actives ayant `target: "all"`.
  - Citoyen connecté : reçoit les alertes actives `target: "all"`, ainsi que celles ciblées sur son quartier (`target: "district"` et `targetDistrict === user.district`) et celles pour personnes vulnérables si son profil a `isVulnerable: true`.
- **Réponse `200`** : tableau d'alertes actives, triées par `startsAt` décroissant.
  ```json
  [
    {
      "id": 1,
      "title": "Alerte Météo",
      "body": "Vents violents attendus.",
      "instructions": "Restez à l'abri.",
      "severity": "urgent",
      "target": "all",
      "targetDistrict": null,
      "startsAt": "2026-10-03T12:00:00.000Z",
      "expiresAt": "2026-10-04T12:00:00.000Z",
      "createdAt": "2026-10-03T12:00:00.000Z",
      "updatedAt": "2026-10-03T12:00:00.000Z"
    }
  ]
  ```

### `GET /alerts`
- **Rôle** : public.
- **Réponse `200`** : tableau de toutes les alertes (historique complet), plus récentes d'abord.

### `GET /alerts/:id`
- **Rôle** : public.
- **Réponse `200`** : détail de l'alerte. **`404`** si introuvable.

### `POST /alerts`
- **Rôle** : `agent`, `admin`.
- **Corps** :
  ```json
  {
    "title": "Alerte Canicule",
    "body": "Températures élevées attendues.",
    "instructions": "Hydratez-vous régulièrement.",
    "severity": "important",
    "target": "vulnerable",
    "targetDistrict": null,
    "startsAt": "2026-10-03T10:00:00.000Z",
    "expiresAt": "2026-10-04T18:00:00.000Z"
  }
  ```
  - `severity` : `info`, `important`, `urgent`.
  - `target` : `all`, `district`, `vulnerable`.
  - `targetDistrict` : requis si `target === "district"`, parmi les 5 quartiers officiels.
- **Effet de bord** : génère automatiquement une notification ciblée pour chaque citoyen concerné.
- **Réponse `201`** : l'alerte créée. **`403`** pour `citizen`. **`400`** si validation échoue.

### `PATCH /alerts/:id/terminate`
- **Rôle** : `agent`, `admin`.
- **Description** : Termine immédiatement une alerte active (positionne `expiresAt` à la date et heure courantes) pour la retirer des alertes actives tout en préservant l'historique complet.
- **Réponse `200`** : l'alerte mise à jour avec sa date de fin. **`404`** si introuvable. **`403`** pour `citizen`.

### `PATCH /alerts/:id`
- **Rôle** : `agent`, `admin`.
- **Corps** : tout ou partie des champs de `POST /alerts`.
- **Réponse `200`** : l'alerte mise à jour. **`404`** si introuvable. **`403`** pour `citizen`.

### `DELETE /alerts/:id`
- **Rôle** : `admin` (réservé exclusivement aux administrateurs pour préserver l'historique d'audit).
- **Réponse `204`**. **`404`** si introuvable. **`403`** pour `citizen` et `agent`.

---

## Notifications (D18, F30)

### `GET /notifications`
- **Rôle** : connecté (tout rôle).
- **Réponse `200`** : tableau des notifications reçues par l'utilisateur connecté, plus récentes d'abord.
  ```json
  [
    {
      "id": 1,
      "type": "alert",
      "title": "[Alerte] Alerte Météo",
      "link": "/alerts/1",
      "readAt": null,
      "createdAt": "2026-10-03T12:00:00.000Z"
    }
  ]
  ```

### `PATCH /notifications/:id/read`
- **Rôle** : connecté (propriétaire de la notification).
- **Réponse `200`** : la notification avec `readAt` mis à jour.
- **`404`** si la notification n'existe pas ou n'appartient pas à l'utilisateur connecté.

---

## Recommandations IA pour les alertes (F31)

### `POST /agent/alerts/ai-recommendations`
- **Rôle** : `agent`, `admin`.
- **Corps** :
  ```json
  {
    "situation": "Tempête tropicale avec fortes rafales de vent et coupures électriques prévues",
    "district": "Port Stellaire",
    "targetAudience": "Personnes âgées et personnes à mobilité réduite"
  }
  ```
  - `situation` : obligatoire (max 1000 caractères).
  - `district` : optionnel.
  - `targetAudience` : optionnel.
- **Réponse `200`** :
  ```json
  {
    "situation": "Tempête tropicale...",
    "recommendations": [
      "Vérifier le stock de lampes torches et piles de secours",
      "Préparer une réserve d'eau potable pour au moins 48 heures",
      "Signaler toute personne isolée au centre de secours municipal"
    ],
    "suggestedInstructions": "Restez confinés à l'intérieur, tenez-vous éloignés des fenêtres...",
    "model": "qwen-turbo"
  }
  ```
- **`503`** si le service IA n'est pas configuré (`QWEN_API_KEY` absente).
- **`504`** si le fournisseur IA dépasse le délai limite (15 s).
- **`502`** si le fournisseur IA renvoie une erreur ou est injoignable.
- **`403`** pour `citizen`.

