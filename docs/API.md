# API — contrat des routes

> **Dernière mise à jour : 03 octobre 2026 à 21:05 UTC+3 (18:05 UTC)**  
> Conforme à 100% avec l'implémentation NestJS (`src/`).

Documentation précise de chaque route de l'API `api-lunar-devs`. Sert de contrat strict entre le backend et l'agent front — toute réponse décrite ici est garantie.

Base URL :
- Production : `https://api.lunardevs.lescomores.webcup.hodi.cloud`
- Local : `http://localhost:3000` (ou le port défini par `PORT`)

Authentification : `Authorization: Bearer <accessToken>` (JWT obtenu via `POST /auth/login`). Les routes publiques n'en ont pas besoin.

Erreurs : toutes les erreurs suivent le format standard NestJS :
```json
{ "statusCode": 400, "error": "Bad Request", "message": "..." }
```
`message` est une chaîne, ou un tableau de chaînes pour les erreurs de validation (`400`, une par champ invalide).

---

## 📋 Tableau Récapitulatif Général des Routes

| Domaine | Méthode & Route | Rôle Requis | Demandes Webcup Couvertes | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Santé** | `GET /` | `public` | - | Message racine / confirmation API en ligne |
| **Santé** | `GET /health` | `public` | - | État global du serveur (mémoire, Node, app) |
| **Santé** | `GET /health/db` | `public` | - | Connexion base de données MySQL |
| **Auth** | `POST /auth/register` | `public` | **D01** | Inscription nouvel habitant (rôle citizen) |
| **Auth** | `POST /auth/login` | `public` | **D03** | Connexion avec identifiants, renvoie JWT |
| **Profil** | `GET /me` | `connecté` | **D08** | Consultation de son espace personnel |
| **Profil** | `PATCH /me` | `connecté` | **D12** | Mise à jour quartier, langue, vulnérabilité |
| **Profil** | `PATCH /me/password` | `connecté` | **D03, F37** | Modification de mot de passe sécurisée avec audit |
| **Profil** | `DELETE /me` | `connecté` | **F33** | Suppression définitive du compte avec mot de passe |
| **Sécurité** | `GET /me/security` | `connecté` | **F37, F54** | Audit des accès personnels, appareils connus et échecs récents |
| **Sécurité** | `GET /agent/security/targeted-accounts` | `agent`, `admin` | **F37** | Comptes ciblés par tentatives frauduleuses (24h) |
| **Rôles** | `GET /agent/ping` | `agent`, `admin` | **D09** | Vérification des privilèges agent / admin |
| **Rôles** | `GET /admin/ping` | `admin` | **D09** | Vérification des privilèges administrateur |
| **Comptes** | `GET /agent/citizens` | `agent`, `admin` | **F34** | Annuaire des citoyens avec recherche et pagination |
| **Comptes** | `PATCH /agent/citizens/:id/status` | `agent`, `admin` | **F34** | Activation / désactivation de compte citoyen |
| **Administration** | `GET /admin/users` | `admin` | **D08, D09** | Liste complète des utilisateurs (citoyens, agents, admin) |
| **Administration** | `POST /admin/users` | `admin` | **D08, D09** | Création d'un compte agent ou citoyen par l'admin |
| **Administration** | `PATCH /admin/users/:id/role` | `admin` | **D08, D09** | Modification de rôle (citoyen / agent / admin) |
| **Administration** | `PATCH /admin/users/:id/status` | `admin` | **D08, D09** | Activation / désactivation de n'importe quel compte (sauf soi-même) |
| **Messages** | `POST /messages` | `citizen` | **D04, F22, F25** | Dépôt d'une question ou d'un signalement |
| **Messages** | `GET /messages/public` | `citizen` | **F52** | Liste publique des signalements des autres citoyens pour soutien |
| **Messages** | `GET /messages/mine` | `citizen` | **F22** | Historique personnel des demandes |
| **Messages** | `GET /messages/mine/:id` | `citizen` | **D11** | Détail d'une demande avec étapes de traitement |
| **Messages** | `POST /messages/:id/support` | `citizen` | **F52** | Soutien citoyen ("upvote") à un signalement |
| **Messages** | `GET /agent/messages` | `agent`, `admin` | **D11, F25, F52** | Gestionnaire agent, filtres et tri par popularité |
| **Messages** | `PATCH /agent/messages/:id/status` | `agent`, `admin` | **D11, F49** | Changement de statut avec note et notification |
| **Dashboard** | `GET /agent/dashboard` | `agent`, `admin` | **D19, F50** | Métriques d'activité, quartiers et catégories |
| **Webcup** | `GET /agent/webcup/requests` | `agent`, `admin` | **D19** | Flux officiel des demandes du concours (proxy) |
| **Services** | `GET /services` | `public` | **D05, F28, F32, F45, F46** | Annuaire, géolocalisation et recherche |
| **Services** | `GET /services/:slug` | `public` | **D05** | Fiche détaillée d'un équipement ou service |
| **Services** | `PATCH /services/:idOrSlug/availability` | `agent`, `admin` | **F38** | Gestion de la disponibilité d'un service |
| **Rendez-vous** | `GET /appointments/slots` | `public` | **F39** | Créneaux disponibles sur les 7 prochains jours |
| **Rendez-vous** | `POST /appointments/book/:slotId` | `citizen` | **F39** | Réservation sécurisée contre la concurrence |
| **Rendez-vous** | `GET /appointments/mine` | `citizen` | **F39** | Mes rendez-vous municipaux à venir |
| **Rendez-vous** | `PATCH /appointments/:id/cancel` | `citizen` | **F39** | Annulation de rendez-vous et libération du créneau |
| **Rendez-vous** | `GET /appointments/:id/ics` | `connecté` | **F40** | Export fichier calendrier iCalendar (.ics) |
| **Rendez-vous** | `GET /agent/appointments` | `agent`, `admin` | **F39** | Vue d'ensemble des créneaux pour les agents |
| **Annonces** | `GET /announcements` | `public` | **D06** | Liste des actualités et communiqués |
| **Annonces** | `GET /announcements/:id` | `public` | **D06** | Détail d'une annonce municipale |
| **Annonces** | `POST /announcements` | `agent`, `admin` | **D06** | Publication d'une annonce (avec notif si important) |
| **Annonces** | `PATCH /announcements/:id` | `agent`, `admin` | **D06** | Modification d'une annonce existante |
| **Annonces** | `DELETE /announcements/:id` | `agent`, `admin` | **D06** | Retrait d'une annonce |
| **Alertes** | `GET /alerts/active` | `public` / `connecté` | **D18, F29** | Alertes en cours (ciblage selon quartier/vulnérabilité)|
| **Alertes** | `GET /alerts` | `public` | **D18** | Historique complet de toutes les alertes |
| **Alertes** | `GET /alerts/:id` | `public` | **D18** | Fiche d'une alerte spécifique |
| **Alertes** | `POST /alerts` | `agent`, `admin` | **D18** | Déclenchement d'une alerte avec notifications |
| **Alertes** | `PATCH /alerts/:id/terminate` | `agent`, `admin` | **D18** | Clôture immédiate d'une alerte |
| **Alertes** | `PATCH /alerts/:id` | `agent`, `admin` | **D18** | Modification des consignes d'une alerte |
| **Alertes** | `DELETE /alerts/:id` | `admin` | **D18** | Suppression définitive (réservée admin) |
| **Alertes** | `POST /agent/alerts/ai-recommendations` | `agent`, `admin` | **F31** | Recommandations IA d'urgence et vulnérabilité |
| **Notifications** | `GET /notifications` | `connecté` | **F30, F40** | Liste des notifications et alertes ciblées |
| **Notifications** | `PATCH /notifications/:id/read` | `connecté` | **F30** | Acquittement de lecture d'une notification |
| **Audit** | `GET /agent/audit-logs` | `agent`, `admin` | **F47, F48** | Journal d'audit traçant « qui a fait quoi » |
| **Transports** | `GET /transports` | `public` | **F36** | Lignes, horaires, fréquences et arrêts |
| **Transports** | `GET /transports/:codeOrId` | `public` | **F36** | Détail et prochains départs d'une ligne |
| **Transports** | `PATCH /transports/:codeOrId/status` | `agent`, `admin` | **F36** | Mise à jour de l'état du trafic en direct |
| **Données / RGPD** | `POST /privacy/inquiries` | `citizen` | **F51** | Réclamation ou question sur les données personnelles |
| **Données / RGPD** | `GET /privacy/inquiries/mine` | `citizen` | **F51** | Suivi personnel de ses demandes RGPD |
| **Données / RGPD** | `GET /agent/privacy/inquiries` | `agent`, `admin` | **F51** | Registre des sollicitations RGPD pour agents |
| **Données / RGPD** | `PATCH /agent/privacy/inquiries/:id/status` | `agent`, `admin` | **F51** | Réponse officielle et notification au citoyen |

---


## Santé

### `GET /`
- **Rôle** : public.
- **Réponse `200`** : confirmation textuelle que le serveur racine est en ligne.
  ```text
  Hello World!
  ```

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

### `GET /me/security` (F37, F54)
- **Rôle** : connecté (tout rôle).
- **Réponse `200`** : audit de sécurité du citoyen connecté (dernière connexion réussie, appareils connus avec date/ip, échecs récents, historique des 10 dernières tentatives) :
  ```json
  {
    "lastLoginAt": "2026-10-03T12:00:00.000Z",
    "lastLoginIp": "192.168.1.1",
    "devices": [
      {
        "id": 1,
        "label": "Chrome sur Windows",
        "firstSeenAt": "2026-10-03T10:00:00.000Z",
        "lastSeenAt": "2026-10-03T12:00:00.000Z",
        "lastIp": "192.168.1.1"
      }
    ],
    "recentFailures": [
      { "id": 14, "ip": "192.168.1.1", "date": "2026-10-03T11:58:00.000Z" }
    ],
    "history": [
      { "id": 15, "ip": "192.168.1.1", "success": true, "date": "2026-10-03T12:00:00.000Z" }
    ]
  }
  ```

#### Notification de connexion depuis un nouvel appareil (F54)
- À chaque connexion réussie (`POST /auth/login`), l'empreinte de l'user-agent est vérifiée.
- Si l'appareil est déjà connu, `last_seen_at` et `last_ip` sont simplement mis à jour.
- Si l'appareil est nouveau, il est enregistré et une **notification de sécurité** est immédiatement générée :
  `Nouvelle connexion à votre compte depuis [libellé], le [date et heure]. Si ce n'est pas vous, changez immédiatement votre mot de passe.` avec lien direct vers `/me/security`.
- Une entrée correspondante est également consignée dans le journal d'audit (`auth.new_device_login`).
- Lors de l'inscription initiale (`POST /auth/register`), l'appareil est enregistré sans déclencher de notification.

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
  { "firstName": "Alice", "lastName": "Dupont", "district": "Port Stellaire", "preferredLanguage": "fr", "isVulnerable": true }
  ```
  - `firstName` : chaîne non vide, 100 caractères max.
  - `lastName` : chaîne non vide, 100 caractères max.
  - `district` : une valeur parmi `Centre-Ville`, `Port Stellaire`, `Quartier des Dunes`, `Hauts de Nova`, `Faubourg Est` (mêmes quartiers que `GET /services`). **`400`** si une autre valeur est envoyée.
  - `preferredLanguage` : texte libre (code ou nom de langue), 50 caractères max.
  - `isVulnerable` : booléen.
- **Réponse `200`** : le profil mis à jour (même forme que `GET /me`).
  `profileCompleted` passe automatiquement à `true` dès que `district` **et** `preferredLanguage` sont tous les deux renseignés — ce champ n'est jamais réglable directement par le client.

### `PATCH /me/password` (D03, F37)
- **Rôle** : connecté (tout rôle).
- **Corps** :
  ```json
  {
    "currentPassword": "AncienMotDePasse123!",
    "newPassword": "NouveauMotDePasse123!"
  }
  ```
  - `currentPassword` : chaîne non vide, mot de passe actuel du compte.
  - `newPassword` : chaîne (8 à 72 caractères, au moins 1 lettre majuscule et au moins 1 chiffre). Doit obligatoirement différer du mot de passe actuel.
- **Réponse `200`** :
  ```json
  {
    "message": "Mot de passe modifié avec succès."
  }
  ```
  - **Effets de bord de sécurité & conformité** :
    - Envoi immédiat d'une notification à l'utilisateur : *"Votre mot de passe a été modifié. Si ce n'est pas vous, contactez la mairie."*
    - Écriture d'une entrée dans le journal d'audit (`user_password_changed`, entité `User`, IP de la requête).
- **Codes d'erreur** :
  - **`400 Bad Request`** : nouveau mot de passe trop faible (moins de 8 caractères, pas de majuscule ou de chiffre) ou identique à l'ancien.
  - **`401 Unauthorized`** : mot de passe actuel faux (la tentative échouée est comptabilisée dans les métriques de détection d'intrusions F37) ou jeton manquant/expiré.

### `DELETE /me` (F33)
- **Rôle** : connecté (tout rôle).
- **Corps** :
  ```json
  { "password": "MotDePasseActuel123!" }
  ```
  - `password` : obligatoire, mot de passe actuel de l'utilisateur pour confirmer la suppression définitive.
- **Réponse `200`** :
  ```json
  { "success": true, "message": "Compte supprimé avec succès." }
  ```
  - Les données liées (messages, signalements, notifications) sont supprimées en cascade et les créneaux de rendez-vous réservés par l'utilisateur sont immédiatement libérés.
- **`401`** si mot de passe incorrect ou jeton manquant/expiré.

### `GET /agent/citizens` (F34)
- **Rôle** : `agent`, `admin`.
- **Query params** :
  - `q` (optionnel) : recherche par nom, prénom ou email.
  - `page` (optionnel, défaut 1) : numéro de page.
  - `limit` (optionnel, défaut 20, max 100) : éléments par page.
- **Réponse `200`** :
  ```json
  {
    "data": [
      {
        "id": "12",
        "email": "citoyen@example.com",
        "firstName": "Fatima",
        "lastName": "Ali",
        "role": "citizen",
        "isActive": true,
        "district": "Port Stellaire",
        "preferredLanguage": "fr",
        "isVulnerable": false,
        "profileCompleted": true,
        "createdAt": "..."
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```
- **`403`** pour `citizen`.

### `PATCH /agent/citizens/:id/status` (F34)
- **Rôle** : `agent`, `admin`.
- **Corps** :
  ```json
  { "isActive": false }
  ```
- **Réponse `200`** : profil citoyen mis à jour avec son nouveau statut d'activation.
- **Règles de sécurité strictes** :
  - Un compte désactivé (`isActive: false`) ne peut plus s'authentifier via `/auth/login` (réponse `401 Unauthorized` générique sans révéler la désactivation).
  - Un agent ou administrateur ne peut **jamais** modifier un compte agent ou admin via cette route (**`403 Forbidden`**).
- **`404`** si l'utilisateur n'existe pas.

### `GET /agent/ping`
- **Rôle** : `agent`, `admin`.
- **Réponse `200`** : `{ "status": "ok", "scope": "agent" }`
- **`403`** pour un `citizen`. **`401`** sans token.

### `GET /admin/ping`
- **Rôle** : `admin`.
- **Réponse `200`** : `{ "status": "ok", "scope": "admin" }`
- **`403`** pour `citizen` et `agent`. **`401`** sans token.

### `GET /admin/users` (D08, D09)
- **Rôle** : `admin`.
- **Query params** :
  - `q` (optionnel) : recherche par nom, prénom ou email.
  - `role` (optionnel) : filtre par rôle (`citizen`, `agent`, `admin`).
  - `page` (optionnel, défaut 1) : page demandée.
  - `limit` (optionnel, défaut 20, max 100) : éléments par page.
- **Réponse `200`** :
  ```json
  {
    "data": [
      {
        "id": "1",
        "email": "agent.demo@novaterra.local",
        "firstName": "Sami",
        "lastName": "Benali",
        "role": "agent",
        "isActive": true,
        "district": null,
        "preferredLanguage": null,
        "isVulnerable": false,
        "profileCompleted": false,
        "createdAt": "2026-10-03T12:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```
- **`403`** pour `citizen` et `agent`.

### `POST /admin/users` (D08, D09)
- **Rôle** : `admin`.
- **Corps** :
  ```json
  {
    "email": "nouvel.agent@novaterra.local",
    "password": "AgentPassword123!",
    "firstName": "Yacine",
    "lastName": "Diallo",
    "role": "agent",
    "district": "Port Stellaire"
  }
  ```
  - `email` : adresse email unique et valide.
  - `password` : mot de passe fort (8 à 72 caractères, min 1 majuscule, min 1 chiffre).
  - `firstName`, `lastName` : obligatoires.
  - `role` : un rôle parmi `citizen`, `agent`, `admin`.
- **Réponse `201`** : profil sécurisé de l'utilisateur créé.
- **`400`** si email déjà existant ou validation échouée. **`403`** pour `citizen` et `agent`.

### `PATCH /admin/users/:id/role` (D08, D09)
- **Rôle** : `admin`.
- **Corps** :
  ```json
  {
    "role": "agent"
  }
  ```
- **Réponse `200`** : profil de l'utilisateur avec son nouveau rôle.
- **Règle de sécurité** : un administrateur ne peut pas se retirer à lui-même le rôle `admin` (**`400 Bad Request`**).
- **`404`** si l'utilisateur n'existe pas. **`403`** pour `citizen` et `agent`.

### `PATCH /admin/users/:id/status` (D08, D09)
- **Rôle** : `admin`.
- **Corps** :
  ```json
  {
    "isActive": false
  }
  ```
- **Réponse `200`** : profil de l'utilisateur avec son statut d'activation mis à jour.
- **Règle de sécurité** : un administrateur ne peut pas désactiver son propre compte (**`400 Bad Request`**).
- **`404`** si l'utilisateur n'existe pas. **`403`** pour `citizen` et `agent`.

---

## Messages et signalements des habitants (Bloc 2 — D04, D11, F22, F25)

Un habitant envoie une question ou un signalement d'incident à un service de la ville. Les étapes de traitement (`nouveau` → `en_cours` → `traite`) sont historisées dans une chronologie avec notes explicatives.

### `POST /messages`
- **Rôle** : `citizen`.
- **Corps (Question classique)** :
  ```json
  {
    "type": "question",
    "subject": "Horaires de la mairie",
    "body": "Pourriez-vous me préciser les créneaux d'ouverture le samedi matin ?",
    "category": "administratif"
  }
  ```
  - `type` : optionnel, défaut `question`. Valeurs : `question`, `signalement`.
  - `subject` : 3 à 150 caractères.
  - `body` : 10 à 5000 caractères.
  - `category` : texte libre (1 à 100 car.) si question.
- **Corps (Signalement d'incident — F25)** :
  ```json
  {
    "type": "signalement",
    "subject": "Lampadaire défaillant",
    "body": "Le lampadaire face au numéro 12 scintille et s'éteint la nuit.",
    "category": "eclairage",
    "district": "Port Stellaire",
    "preciseLocation": "12 avenue de la Mer, en face de la pharmacie"
  }
  ```
  - `category` : obligatoire parmi `voirie`, `eclairage`, `propreté`, `eau`, `autre`.
  - `district` : obligatoire parmi `Centre-Ville`, `Port Stellaire`, `Quartier des Dunes`, `Hauts de Nova`, `Faubourg Est`.
  - `preciseLocation` : obligatoire (max 255 caractères).
- **Réponse `201`** — la référence (`reference`) et la chronologie initiale sont créées immédiatement :
  ```json
  {
    "id": 1,
    "reference": "NT-0001",
    "type": "signalement",
    "subject": "Lampadaire défaillant",
    "body": "...",
    "category": "eclairage",
    "district": "Port Stellaire",
    "preciseLocation": "12 avenue de la Mer, en face de la pharmacie",
    "status": "nouveau",
    "createdAt": "2026-10-03T12:00:00.000Z",
    "updatedAt": "2026-10-03T12:00:00.000Z",
    "history": [
      {
        "id": 1,
        "status": "nouveau",
        "note": "Signalement enregistré",
        "changedAt": "2026-10-03T12:00:00.000Z",
        "changedBy": { "id": "10", "firstName": "Alice", "lastName": "Mbaé" }
      }
    ]
  }
  ```
- **`403`** pour `agent`/`admin` (route réservée aux citoyens). **`400`** si validation échoue (ex. catégorie inconnue ou champ manquant pour un signalement).

### `GET /messages/public` (F52)
- **Rôle** : `citizen`.
- **Description** : Renvoie la liste de tous les signalements d'incidents publics déposés par les habitants afin de permettre le soutien communautaire ("upvoting"). **Aucune donnée personnelle de l'auteur n'est exposée** (anonymisation stricte).
- **Réponse `200`** :
  ```json
  [
    {
      "id": 1,
      "reference": "NT-0001",
      "type": "signalement",
      "subject": "Lampadaire défaillant",
      "body": "Le lampadaire scintille...",
      "category": "eclairage",
      "district": "Port Stellaire",
      "preciseLocation": "12 avenue de la Mer",
      "status": "en_cours",
      "supportCount": 4,
      "supportedByMe": false,
      "isMine": false,
      "createdAt": "2026-10-03T12:00:00.000Z",
      "updatedAt": "2026-10-03T12:00:00.000Z"
    }
  ]
  ```
- **`401`** sans token, **`403`** pour `agent`/`admin`.

### `GET /messages/mine`
- **Rôle** : `citizen`.
- **Réponse `200`** : liste des messages de l'habitant avec leur chronologie d'étapes (`history`), triés du plus récent au plus ancien.
  ```json
  [
    {
      "id": 1,
      "reference": "NT-0001",
      "type": "signalement",
      "subject": "...",
      "body": "...",
      "category": "eclairage",
      "district": "Port Stellaire",
      "preciseLocation": "...",
      "status": "en_cours",
      "createdAt": "...",
      "updatedAt": "...",
      "history": [
        { "id": 1, "status": "nouveau", "note": "Signalement enregistré", "changedAt": "..." },
        { "id": 2, "status": "en_cours", "note": "Équipe technique dépêchée", "changedAt": "..." }
      ]
    }
  ]
  ```

### `GET /messages/mine/:id`
- **Rôle** : `citizen`.
- **Réponse `200`** : détail du message avec chronologie complète.
- **`404`** si le message n'existe pas ou n'appartient pas au citoyen connecté (ne fuite aucune information). **`401`** sans token, **`403`** pour `agent`/`admin`.

### `POST /messages/:id/support` (F52)
- **Rôle** : `citizen`.
- **Description** : Permet à un habitant d'apporter son soutien (ou retirer son soutien en cliquant à nouveau, système toggle) à un signalement d'incident déposé par un autre citoyen.
- **Règle stricte** : Il est interdit de soutenir sa propre demande (**`400 Bad Request`** avec message *"Vous ne pouvez pas soutenir votre propre demande"*).
- **Réponse `200`** :
  ```json
  {
    "supported": true,
    "supportCount": 4
  }
  ```
- **`400`** si tentative de soutenir son propre signalement.
- **`404`** si message non trouvé. **`401`** sans token.

### `GET /agent/messages?status=&type=&sort=`
- **Rôle** : `agent`, `admin`.
- **Query params** :
  - `status` (optionnel) : `nouveau`, `en_cours`, `traite`.
  - `type` (optionnel) : `question`, `signalement`.
  - `sort` (optionnel) : `recent` (défaut) ou `supports` (trie les signalements par nombre décroissant de soutiens citoyens — F52).
- **Réponse `200`** :
  ```json
  {
    "messages": [
      {
        "id": 1,
        "reference": "NT-0001",
        "type": "signalement",
        "subject": "...",
        "body": "...",
        "category": "eclairage",
        "district": "Port Stellaire",
        "preciseLocation": "...",
        "status": "en_cours",
        "supportCount": 12,
        "createdAt": "...",
        "updatedAt": "...",
        "author": { "id": "3", "firstName": "Mo", "lastName": "Said", "email": "mo@example.com" },
        "history": [ ... ]
      }
    ],
    "counts": { "nouveau": 1, "en_cours": 1, "traite": 0 }
  }
  ```

### `PATCH /agent/messages/:id/status` (D11, F49)
- **Rôle** : `agent`, `admin`.
- **Corps** :
  ```json
  {
    "status": "en_cours",
    "note": "Intervention programmée pour demain matin"
  }
  ```
  - `status` : obligatoire (`nouveau`, `en_cours`, `traite`).
  - `note` : facultatif (max 1000 caractères), ajoutée à l'étape d'historique.
- **Réponse `200`** : le message mis à jour avec son historique actualisé.
- **Notification automatique (F49)** : une `Notification` de type `demande_statut` est automatiquement générée pour l'auteur du message l'informant du changement d'état (ex: *« Votre demande NT-0001 est passée à l'état : en cours »*).
- **`404`** si message inexistant. **`400`** si `status` invalide.

---

## Espace agents + API Webcup (Bloc 3 — D19, F50)

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

### `GET /agent/dashboard` (D19, F50)
- **Rôle** : `agent`, `admin`.
- **Réponse `200`** : tableau de bord enrichi de suivi d'activité municipale :
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
    ],
    "metrics": {
      "byCategory": { "voirie": 5, "eclairage": 3, "eau": 2 },
      "byDistrict": { "Centre-Ville": 6, "Port Stellaire": 4 },
      "totalSupports": 24,
      "upcomingAppointmentsCount": 8,
      "activeAlertsCount": 2
    }
  }
  ```
  - `metrics` (F50) : répartition des signalements par catégorie et quartier, volume total de soutiens citoyens, rendez-vous à venir et alertes actives.

## Contenu de la ville (Bloc 4 — D05, D06, F28, F32, F38, F45, F46)

### `GET /services`
- **Rôle** : public.
- **Query params (F28, F32, F45, F46)** :
  - `q` (optionnel) : recherche textuelle sur le nom, description, détails ou catégorie (ex: `?q=hopital` ou `?q=urgences`).
  - `category` (optionnel) : filtrage par catégorie fonctionnelle (`sante`, `securite`, `administratif`, `culture`, `education`, `voirie`, `eau-energie`, `tourisme`).
  - `district` (optionnel) : filtrage par quartier de Nova Terra (`Centre-Ville`, `Port Stellaire`, etc.).
  - `featured` (optionnel) : `true` / `false` pour filtrer les services mis en avant.
  - `emergency` (optionnel) : `true` / `false` pour filtrer les services de secours et d'urgence vitale 24h/24 (F46).
- **Tri des résultats** : les services mis en avant (`featured: true`) apparaissent **toujours en premier**, suivis des services d'urgence, puis par ordre alphabétique.
- **Réponse `200`** : tableau des services municipaux incluant la géolocalisation pour la cartographie (F45), les urgences (F46) et la disponibilité (F38) :
  ```json
  [
    {
      "id": 4,
      "slug": "hopital-etoile-du-sud",
      "name": "Hôpital Étoile du Sud",
      "category": "sante",
      "description": "Urgences médicales 24h/24 et soins hospitaliers de référence.",
      "details": "Établissement hospitalier principal de Nova Terra...",
      "contact": "+269 773 20 01 · hopital@novaterra.city",
      "horaires": "24h/24, 7j/7",
      "district": "Port Stellaire",
      "address": "42 Avenue du Port, Port Stellaire",
      "latitude": -11.7185,
      "longitude": 43.2421,
      "featured": true,
      "isEmergency": true,
      "availability": "disponible",
      "availabilityMessage": null,
      "availableAgainAt": null,
      "alternative": null
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

---

## Journal d'Audit & Traçabilité Administrative (F47, F48)

Toutes les actions administratives critiques (mises à jour de statut de demandes, activation/désactivation de comptes citoyens, suppressions de comptes, modifications de disponibilité des services, création et gestion des alertes d'urgence) sont consignées de manière immuable avec horodatage, auteur et détails.

### `GET /agent/audit-logs`
- **Rôle** : `agent`, `admin`.
- **Query params** (optionnels) :
  - `action` (string) : filtrer par type d'action (`message_status_updated`, `citizen_account_activated`, `citizen_account_deactivated`, `citizen_account_deleted`, `service_availability_updated`, `alert_created`, `alert_updated`, `alert_terminated`, `alert_deleted`).
  - `entityType` (string) : filtrer par type d'entité (`CitizenMessage`, `User`, `MunicipalService`, `Alert`).
  - `authorId` (string/number) : filtrer par auteur de l'action.
  - `page` (int, défaut `1`).
  - `limit` (int, défaut `20`, max `100`).
- **Réponse `200`** :
  ```json
  {
    "items": [
      {
        "id": "e2c34d88-75d1-4db8-b570-5ff0b4ff5dbb",
        "action": "message_status_updated",
        "entityType": "CitizenMessage",
        "entityId": "42",
        "details": "{\"reference\":\"SIG-42\",\"previousStatus\":\"nouveau\",\"newStatus\":\"en_cours\",\"note\":\"Pris en charge par l'équipe voirie\"}",
        "ipAddress": null,
        "createdAt": "2026-10-03T16:30:00.000Z",
        "author": {
          "id": 1,
          "firstName": "Alice",
          "lastName": "Mbaé",
          "email": "agent@novaterra.gov",
          "role": "agent"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
  ```
- **`403`** pour `citizen`, **`401`** sans token.

---

## Transports Municipaux (F36)

Horaires, fréquences, arrêts et état du trafic en temps réel pour l'ensemble des transports en commun de Nova Terra (navettes, bus, tramways, liaisons maritimes).

### `GET /transports`
- **Rôle** : public (pas d'authentification requise).
- **Query params** (optionnels) :
  - `type` : `navette` | `bus` | `tram` | `batelier`.
  - `q` : recherche textuelle sur le nom de la ligne, le code, l'origine ou la destination.
- **Réponse `200`** :
  ```json
  [
    {
      "id": 1,
      "code": "NAV-1",
      "name": "Navette Éco-Centre",
      "type": "navette",
      "origin": "Port Stellaire",
      "destination": "Centre Ville",
      "status": "normal",
      "statusMessage": "Circulation fluide",
      "frequency": "Toutes les 8 min",
      "operatingHours": "05:30 - 23:30",
      "stops": "[\"Port Stellaire\",\"Gare Maritime\",\"Place Centrale\",\"Hôtel de Ville\"]",
      "nextDepartures": "[\"10:15\",\"10:23\",\"10:31\",\"10:39\"]",
      "createdAt": "2026-10-03T16:00:00.000Z",
      "updatedAt": "2026-10-03T16:00:00.000Z"
    }
  ]
  ```

### `GET /transports/:codeOrId`
- **Rôle** : public.
- **Réponse `200`** : détails complets de la ligne par son code (`NAV-1`) ou son identifiant numérique (`1`).
- **`404`** si la ligne n'existe pas.

### `PATCH /transports/:codeOrId/status`
- **Rôle** : `agent`, `admin`.
- **Corps** :
  ```json
  {
    "status": "perturbe",
    "statusMessage": "Retard de 10 min suite à incident technique sur voie"
  }
  ```
- **Réponse `200`** : ligne mise à jour avec traçabilité automatique dans le journal d'audit (`AuditLog`).
- **`403`** pour `citizen`.

---

## Protection des Données & Demandes RGPD (F51)

Permet aux citoyens de poser des questions sur l'usage de leurs données ou d'exercer leurs droits (accès, rectification, effacement, opposition), avec accusé de réception, référence unique, historique personnel et traitement suivi par les agents municipaux.

### `POST /privacy/inquiries`
- **Rôle** : `citizen`.
- **Corps** :
  ```json
  {
    "type": "explication",
    "subject": "Inquiétude concernant le traitement de mes données de localisation",
    "description": "Je souhaite comprendre comment sont utilisées les coordonnées GPS transmises lors d'un signalement d'incident."
  }
  ```
  - `type` : `acces` | `rectification` | `effacement` | `explication` | `opposition` | `autre`.
- **Réponse `201`** :
  ```json
  {
    "id": 1,
    "reference": "RGPD-2026-0001",
    "type": "explication",
    "subject": "Inquiétude concernant le traitement...",
    "description": "...",
    "status": "en_attente",
    "responseNote": null,
    "respondedAt": null,
    "createdAt": "2026-10-03T16:40:00.000Z",
    "updatedAt": "2026-10-03T16:40:00.000Z"
  }
  ```
- **`403`** pour les agents/admin (réservé aux citoyens connectés).

### `GET /privacy/inquiries/mine`
- **Rôle** : `citizen`.
- **Réponse `200`** : liste des demandes RGPD du citoyen connecté triées du plus récent au plus ancien.

### `GET /agent/privacy/inquiries`
- **Rôle** : `agent`, `admin`.
- **Query params** (optionnel) : `status` (`en_attente`, `en_cours`, `traitee`, `fermee`).
- **Réponse `200`** : ensemble des demandes citoyennes avec coordonnées du citoyen et informations de traitement.

### `PATCH /agent/privacy/inquiries/:id/status`
- **Rôle** : `agent`, `admin`.
- **Corps** :
  ```json
  {
    "status": "traitee",
    "responseNote": "Les données de géolocalisation ne sont utilisées que pour le guidage des équipes de voirie et sont anonymisées après 30 jours."
  }
  ```
- **Réponse `200`** : demande mise à jour. Génère automatiquement une notification citoyenne (`Notification`) et un enregistrement dans le journal d'audit (`AuditLog`).

---

## Participation Citoyenne & Démocratie Participative (F65, F66, F67, F68)

Permet aux citoyens et visiteurs de consulter les grands projets urbains de Nova Terra, de voter aux consultations citoyennes associées, de déposer des boîtes à idées avec référence de suivi `IDEE-...` et permet aux agents de piloter les propositions.

### `GET /projects`
- **Rôle** : public.
- **Réponse `200`** : liste des projets avec leurs consultations associées.
  ```json
  [
    {
      "id": 1,
      "title": "Végétalisation du Dôme Central",
      "description": "Implantation d'espaces verts suspendus...",
      "district": "Centre-Ville",
      "status": "en_cours",
      "startDate": "2026-09-01",
      "endDate": "2027-03-31",
      "consultations": [
        {
          "id": 1,
          "question": "Quel aménagement végétal prioritaire souhaitez-vous installer sous la verrière ?",
          "options": ["Jardins partagés suspendus", "Forêt urbaine de palmiers régénérants", "Bassin d'eau filtrée et allées ombragées"],
          "endDate": "2026-11-03T00:00:00.000Z"
        }
      ]
    }
  ]
  ```

### `GET /projects/:id`
- **Rôle** : public.
- **Réponse `200`** : détail d'un projet avec ses consultations et les résultats agrégés des votes.
  ```json
  {
    "id": 1,
    "title": "Végétalisation du Dôme Central",
    "description": "...",
    "district": "Centre-Ville",
    "status": "en_cours",
    "consultations": [
      {
        "id": 1,
        "question": "Quel aménagement végétal prioritaire...",
        "options": ["Jardins partagés suspendus", "Forêt urbaine de palmiers régénérants", "Bassin d'eau filtrée et allées ombragées"],
        "endDate": "2026-11-03T00:00:00.000Z",
        "totalResponses": 12,
        "aggregatedResults": {
          "Jardins partagés suspendus": 7,
          "Forêt urbaine de palmiers régénérants": 3,
          "Bassin d'eau filtrée et allées ombragées": 2
        }
      }
    ]
  }
  ```

### `POST /consultations/:id/responses`
- **Rôle** : `citizen`.
- **Règle** : un seul avis par citoyen et par consultation (les soumissions suivantes modifient le vote existant). Renvoie une référence de participation unique `CONS-<id>-XXXXXX` et les résultats agrégés recalculés.
- **Corps** :
  ```json
  {
    "option": "Jardins partagés suspendus",
    "comment": "Excellente idée pour créer du lien entre résidents."
  }
  ```
- **Réponse `201`** (ou `200` sur mise à jour) :
  ```json
  {
    "message": "Avis enregistré avec succès",
    "reference": "CONS-1-849201",
    "response": {
      "id": 4,
      "consultationId": 1,
      "citizenId": 2,
      "reference": "CONS-1-849201",
      "option": "Jardins partagés suspendus",
      "comment": "Excellente idée pour créer du lien entre résidents."
    },
    "aggregatedResults": {
      "Jardins partagés suspendus": 8,
      "Forêt urbaine de palmiers régénérants": 3,
      "Bassin d'eau filtrée et allées ombragées": 2
    },
    "totalResponses": 13
  }
  ```

### `POST /ideas`
- **Rôle** : `citizen`.
- **Corps** :
  ```json
  {
    "title": "Bibliothèque d'outils partagés au Port Stellaire",
    "description": "Mettre à disposition des habitants des outils de réparation spatiale et de bricolage en libre emprunt.",
    "district": "Port Stellaire"
  }
  ```
- **Réponse `201`** :
  ```json
  {
    "id": 1,
    "reference": "IDEE-2026-4821",
    "title": "Bibliothèque d'outils partagés au Port Stellaire",
    "description": "...",
    "district": "Port Stellaire",
    "status": "soumise",
    "adminNote": null,
    "citizenId": 2,
    "createdAt": "2026-10-04T01:00:00.000Z"
  }
  ```

### `GET /ideas/mine`
- **Rôle** : `citizen`.
- **Réponse `200`** : liste des idées déposées par le citoyen connecté avec leur statut (`soumise`, `en_etude`, `retenue`, `rejetee`) et la note éventuelle des agents.

### `GET /agent/ideas`
- **Rôle** : `agent`, `admin`.
- **Query params** (optionnel) : `status` (`soumise`, `en_etude`, `retenue`, `rejetee`).
- **Réponse `200`** : ensemble des idées citoyennes avec les informations du citoyen auteur.

### `PATCH /agent/ideas/:id`
- **Rôle** : `agent`, `admin`.
- **Corps** :
  ```json
  {
    "status": "en_etude",
    "adminNote": "Proposition transmise à la commission d'urbanisme pour chiffrage."
  }
  ```
- **Réponse `200`** : idée mise à jour.

---

## Avis sur les Services Municipaux (F76)

Permet aux citoyens d'évaluer la qualité d'un service municipal (note 1 à 5 + commentaire optionnel), avec accusé de réception, référence `AVIS-...`, calcul instantané de la moyenne et consultation par les agents.

### `POST /services/:id/feedback`
- **Rôle** : `citizen`.
- **Règle** : un seul avis par citoyen et par service (modifiable à volonté en réémettant la requête).
- **Corps** :
  ```json
  {
    "rating": 5,
    "comment": "Personnel très disponible et démarches rapides."
  }
  ```
- **Réponse `201`** :
  ```json
  {
    "message": "Avis enregistré avec succès",
    "reference": "AVIS-1-392182",
    "feedback": {
      "id": 2,
      "serviceId": 1,
      "citizenId": 2,
      "rating": 5,
      "comment": "Personnel très disponible...",
      "reference": "AVIS-1-392182"
    },
    "averageRating": 4.7,
    "totalFeedbacks": 15
  }
  ```

### `GET /agent/service-feedbacks`
- **Rôle** : `agent`, `admin`.
- **Query params** (optionnel) : `serviceId`.
- **Réponse `200`** : ensemble des avis déposés avec détail du service et identité du citoyen.

---

## Partenaires & Associations Locales (F74)

Répertoire des associations et acteurs partenaires de Nova Terra, filtrable par quartier.

### `GET /partners`
- **Rôle** : public.
- **Query params** (optionnel) : `district`.
- **Réponse `200`** :
  ```json
  [
    {
      "id": 1,
      "name": "Éco-Pionniers de Nova Terra",
      "description": "Association citoyenne engagée pour le recyclage des biomatériaux...",
      "address": "12 Avenue de l'Harmonie",
      "district": "Centre-Ville",
      "openingHours": "Mar-Sam 9h-17h",
      "contact": "+269 773 80 01 · contact@ecopionniers.org"
    }
  ]
  ```

---

## Détection de Demandes Similaires (IA) (F75)

Assistance intelligente aux agents municipaux pour détecter les signalements et demandes en doublon ou récurrentes (même incident, voirie abîmée, panne d'eau), croisant la similarité de texte, quartier et catégorie, affinée par le LLM Qwen si configuré.

### `GET /agent/messages/:id/similar`
- **Rôle** : `agent`, `admin`.
- **Réponse `200`** :
  ```json
  {
    "targetMessage": {
      "id": 12,
      "reference": "NT-0012",
      "subject": "Éclairage en panne allée des Sables",
      "body": "Deux lampadaires sont éteints depuis hier soir.",
      "category": "eclairage",
      "district": "Quartier des Dunes"
    },
    "similarMessages": [
      {
        "id": 11,
        "reference": "NT-0011",
        "subject": "Lampadaires hors service secteur Dunes",
        "body": "Plus de lumière sur le chemin piéton.",
        "category": "eclairage",
        "district": "Quartier des Dunes",
        "status": "en_cours",
        "createdAt": "2026-10-04T00:15:00.000Z",
        "similarityScore": 0.85
      }
    ],
    "explanation": "Demandes concordantes concernant une rupture d'alimentation sur le circuit d'éclairage du secteur Dunes.",
    "aiEnhanced": true
  }
  ```


