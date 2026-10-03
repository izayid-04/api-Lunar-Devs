# Demandes couvertes — Nova Terra

Sujet du hackathon 24h Webcup Comores (3-4 octobre 2026) : la plateforme
numérique de la ville **Nova Terra**. Ce document fait correspondre
chaque code de demande traité à ce qui, dans le code, le satisfait —
pour que ce soit vérifiable rapidement (par l'équipe, par le jury).

## Bloc 1 — Comptes, rôles, accès

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **D01** | Inscription | `POST /auth/register` (`src/auth/auth.controller.ts`, `src/auth/auth.service.ts`). Entrées validées (`class-validator` via `RegisterDto`) ; le compte créé est **toujours** `citizen` — le rôle n'est ni demandé ni acceptable depuis le client (`ValidationPipe({ forbidNonWhitelisted: true })` rejette tout champ `role` envoyé en plus, voir `src/main.ts`). |
| **D03** | Connexion | `POST /auth/login` (même fichiers). Vérifie le mot de passe avec `bcryptjs` (`bcrypt.compare`), renvoie un JWT (`{ accessToken }`) signé avec `JWT_SECRET`, valide 1 jour. Identifiants invalides → `401` générique (pas d'indice sur l'existence du compte). |
| **D08** | Espace personnel | `GET /me` (`src/auth/me.controller.ts`), protégé par `JwtAuthGuard`. Renvoie le profil de l'utilisateur authentifié par son token (`id`, `email`, `firstName`, `lastName`, `role`, `createdAt`) — jamais `passwordHash`. |
| **D09** | 3 rôles + contrôle d'accès | Enum `UserRole` (`citizen`, `agent`, `admin`, `src/users/user-role.enum.ts`), colonne `role` sur `User`. Contrôle d'accès par `JwtAuthGuard` (authentification) + `@Roles(...)` / `RolesGuard` (autorisation, `src/auth/`). Démontré par `GET /agent/ping` (`agent`, `admin`) et `GET /admin/ping` (`admin` seul) dans `src/role-demo.controller.ts` — un `citizen` reçoit `403` sur les deux. |

Détail technique (modèle de données, variables d'environnement,
comptes de démonstration pour le jury, procédure de test) dans
[`docs/DEPLOIEMENT.md`](./DEPLOIEMENT.md), section **§8 Authentification
et rôles**.

## Bloc 2 — Messages des habitants vers les services

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **D04** | Les habitants peuvent envoyer un message à un service de la ville | `POST /messages` (`src/messages/`), réservé aux `citizen`. Entité `CitizenMessage` (`id`, `reference`, `author`, `subject`, `body`, `category`, `status`, `createdAt`, `updatedAt`). |
| **F22** | L'habitant reçoit une confirmation d'envoi, suivable | `POST /messages` renvoie une référence lisible (`NT-0001`, `NT-0002`, ...) générée depuis l'id. `GET /messages/mine` liste les messages de l'habitant connecté avec leur statut (`nouveau`, `en_cours`, `traite`), triés du plus récent au plus ancien. |

Côté agent : `GET /agent/messages?status=` (liste filtrable, triée, avec
le nombre de messages par statut) et `PATCH /agent/messages/:id/status`
(changement de statut) — réservés à `agent`/`admin`.

Détail complet des routes (corps, réponses, codes d'erreur) dans
[`docs/API.md`](./API.md).

## Bloc 3 — Espace agents + API Webcup

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **D19** | Espace agents avec accès à l'API Webcup | `GET /agent/webcup/requests` (`src/webcup/`), réservé `agent`/`admin`. Proxy vers `https://24h.webcup.fr/wp-json/webcup/v1/requests` (en-tête `X-Webcup-Api-Key`, clé lue depuis `WEBCUP_API_KEY`, jamais exposée en réponse ni en log), avec cache mémoire de 60 s et repli sur le dernier cache en cas d'échec amont. Complété par `GET /agent/dashboard` (résumé : nombre d'habitants, messages par statut, 5 derniers messages). |

Détail complet (format de réponse, comportement du cache, codes
d'erreur) dans [`docs/API.md`](./API.md).

## Bloc 4 — Contenu de la ville

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **D05** | Annuaire des services municipaux | Entité `MunicipalService` (`src/services/`) — 8 services seedés de façon idempotente, répartis sur 5 quartiers (Centre-Ville, Port Stellaire, Quartier des Dunes, Hauts de Nova, Faubourg Est). `GET /services` (liste) et `GET /services/:slug` (détail), publics — le champ `district` sert de base pour la carte interactive à venir. |
| **D06** | Annonces municipales | Entité `Announcement` (`src/announcements/`) — seed idempotent de 4 annonces. `GET /announcements` (liste, plus récentes d'abord) et `GET /announcements/:id`, publics. Gestion (`POST`/`PATCH`/`DELETE /announcements`) réservée à `agent`/`admin` ; l'auteur est suivi en interne mais jamais exposé publiquement. |

Détail complet des routes dans [`docs/API.md`](./API.md).

## Chantier 1 — Profil (prépare D12, F29, F31)

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **D12** (prépa) | Profil habitant (quartier, langue, vulnérabilité) | `User.district`, `preferredLanguage`, `isVulnerable`, `profileCompleted` (`src/users/entities/user.entity.ts`). `PATCH /me` pour les compléter — `district` validé contre la même liste de quartiers que `GET /services` (`src/common/districts.ts`). `profileCompleted` est calculé côté serveur, jamais réglable par le client. |

Ce chantier prépare le terrain pour les alertes ciblées par quartier/vulnérabilité (D18, F29) et les recommandations IA (F31) — pas encore implémentées à ce stade.

## Prochains blocs

À compléter au fur et à mesure que les blocs suivants du sujet Nova
Terra sont traités — un tableau par bloc, même format (code → demande →
endpoint(s)/fichier(s) qui la satisfont).
