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
| **F33** | Suppression de compte citoyen | `DELETE /me` (`src/auth/me.controller.ts`), confirmation obligatoire par mot de passe (`401` si incorrect). Suppression en cascade propre des données liées et libération automatique des créneaux de rendez-vous réservés. |
| **F34** | Administration des comptes citoyens par les agents | `GET /agent/citizens` (recherche `?q=`, pagination `?page=` et `?limit=`), `PATCH /agent/citizens/:id/status` pour activer/désactiver un compte. Un compte désactivé est bloqué à la connexion (`401`). Un agent ne peut en aucun cas modifier un agent ou admin (`403`). |

Détail technique (modèle de données, variables d'environnement,
comptes de démonstration pour le jury, procédure de test) dans
[`docs/DEPLOIEMENT.md`](./DEPLOIEMENT.md), section **§8 Authentification
et rôles**.

## Bloc 2 — Messages et signalements des habitants (D04, D11, F22, F25)

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **D04** | Les habitants peuvent envoyer un message à un service de la ville | `POST /messages` (`src/messages/`), réservé aux `citizen`. Entité `CitizenMessage` (`id`, `reference`, `author`, `type`, `subject`, `body`, `category`, `district`, `preciseLocation`, `status`, `createdAt`, `updatedAt`). |
| **F22** | L'habitant reçoit une confirmation d'envoi, suivable | `POST /messages` renvoie une référence lisible (`NT-0001`, `NT-0002`, ...) générée depuis l'id. `GET /messages/mine` liste les messages de l'habitant connecté avec leur statut (`nouveau`, `en_cours`, `traite`), triés du plus récent au plus ancien. |
| **D11** | Suivi et chronologie des étapes d'un message / signalement | Entité `MessageStatusHistory` (`message`, `status`, `note`, `changedAt`, `changedBy`). Création automatique de l'étape initiale à la soumission et à chaque changement de statut via `PATCH /agent/messages/:id/status` (qui accepte une `note` optionnelle). `GET /messages/mine` et `GET /messages/mine/:id` renvoient l'historique chronologique pour le citoyen (`404` si non propriétaire ou inexistant). |
| **F25** | Signalement d'incidents par quartier | Support du type `signalement` (vs `question`) sur `POST /messages`. Champs obligatoires : `district` (validé contre `DISTRICTS`), `preciseLocation`, `category` (`voirie`, `eclairage`, `propreté`, `eau`, `autre`). Filtrage par type disponible côté agent via `GET /agent/messages?type=signalement`. |

Côté agent : `GET /agent/messages?status=&type=` (liste filtrable, triée, avec
le nombre de messages par statut) et `PATCH /agent/messages/:id/status`
(changement de statut avec note) — réservés à `agent`/`admin`.

Détail complet des routes (corps, réponses, codes d'erreur) dans
[`docs/API.md`](./API.md).

## Bloc 3 — Espace agents + API Webcup

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **D19** | Espace agents avec accès à l'API Webcup | `GET /agent/webcup/requests` (`src/webcup/`), réservé `agent`/`admin`. Proxy vers `https://24h.webcup.fr/wp-json/webcup/v1/requests` (en-tête `X-Webcup-Api-Key`, clé lue depuis `WEBCUP_API_KEY`, jamais exposée en réponse ni en log), avec cache mémoire de 60 s et repli sur le dernier cache en cas d'échec amont. Complété par `GET /agent/dashboard` (résumé : nombre d'habitants, messages par statut, 5 derniers messages). |

Détail complet (format de réponse, comportement du cache, codes
d'erreur) dans [`docs/API.md`](./API.md).

## Bloc 4 — Contenu de la ville (D05, D06, F28, F32, F45, F46)

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **D05** | Annuaire des services municipaux | Entité `MunicipalService` (`src/services/`) — 8 services seedés de façon idempotente, répartis sur 5 quartiers (Centre-Ville, Port Stellaire, Quartier des Dunes, Hauts de Nova, Faubourg Est). `GET /services` (liste) et `GET /services/:slug` (détail), publics. |
| **D06** | Annonces municipales | Entité `Announcement` (`src/announcements/`) — seed idempotent de 4 annonces. `GET /announcements` (liste, plus récentes d'abord) et `GET /announcements/:id`, publics. Gestion (`POST`/`PATCH`/`DELETE /announcements`) réservée à `agent`/`admin` ; l'auteur est suivi en interne mais jamais exposé publiquement. |
| **F28** | Services prioritaires mis en avant (`featured`) | Champ `featured` sur `MunicipalService`. Tri automatique dans `GET /services` plaçant les services mis en avant en premier (Mairie, Hôpital Étoile du Sud, Voirie). Filtre `?featured=true`. |
| **F32** | Recherche et filtre par catégorie (dont Santé) | Query params `?q=` (recherche plein texte sur nom, description, détails, catégorie) et `?category=sante` sur `GET /services`. Permet aux citoyens de trouver les services de santé instantanément. |
| **F45** | Cartographie des services physiques | Coordonnées GPS (`latitude`, `longitude`) et adresse physique (`address`) sur `MunicipalService` pour chaque équipement de Nova Terra. Permet l'affichage sur plan interactif. |
| **F46** | Localisation rapide des hôpitaux et services d'urgence | Champ `isEmergency` sur `MunicipalService` (Hôpital Étoile du Sud, Commissariat Central, Urgences Eaux & Énergie) avec filtre dédié `GET /services?emergency=true`. |

## Chantier 1 — Profil (prépare D12, F29, F31)

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **D12** (prépa) | Profil habitant (quartier, langue, vulnérabilité) | `User.district`, `preferredLanguage`, `isVulnerable`, `profileCompleted` (`src/users/entities/user.entity.ts`). `PATCH /me` pour les compléter — `district` validé contre la même liste de quartiers que `GET /services` (`src/common/districts.ts`). `profileCompleted` est calculé côté serveur, jamais réglable par le client. |

## Chantier 2 — Alertes et notifications (D18, F29, F30, F31)

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **D18** | Alertes municipales d'urgence | Entité `Alert` (`title`, `body`, `instructions`, `severity`, `target`, `targetDistrict`, `startsAt`, `expiresAt`, `author`). CRUD complet pour `agent`/`admin` (`POST`, `PATCH`, `DELETE /alerts`, `GET /alerts`, `GET /alerts/:id`). |
| **F29** | Ciblage des alertes actives | `GET /alerts/active` : renvoie les alertes globales aux visiteurs non connectés, et filtre automatiquement selon le profil de l'utilisateur connecté (quartier de résidence si `target === 'district'`, et condition de vulnérabilité si `target === 'vulnerable'`). |
| **F30** | Centre de notifications pour les habitants | Entité `Notification` (`user`, `type`, `title`, `link`, `readAt`, `createdAt`). Déclenchées automatiquement lors de la création d'une alerte (vers les citoyens concernés) ou d'une annonce importante (`isImportant === true`). Consultation via `GET /notifications` et acquittement via `PATCH /notifications/:id/read`. |
| **F31** | Recommandations IA pour les personnes vulnérables | `POST /agent/alerts/ai-recommendations` (`src/alerts/alerts-ai.service.ts`), réservé `agent`/`admin`. Intégration de Qwen (API compatible OpenAI) avec prompt de gestion de crise, timeout 15 s, repli d'erreur sans fuite de secrets. |

## Chantier 3 — Sécurité des connexions (F37)

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **F37** | Sécurité des connexions et audit des accès | Rate limiting avec `@nestjs/throttler` sur `/auth/login` et `/auth/register` (avec prise en charge `trust proxy`). Verrouillage automatique de 15 min après 5 échecs de connexion (calculé à partir des `LoginAttempt` sans révéler si le compte existe, réponse standard `429 Too Many Requests`). Entité `LoginAttempt` (email, ip, success, createdAt). `GET /me/security` pour le citoyen (dernière connexion, tentatives échouées récentes, historique). `GET /agent/security/targeted-accounts` pour agents/admin (liste des comptes ciblés par des échecs sur 24h). |

## Chantier 4 — Disponibilité des services (F38)

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **F38** | Disponibilité et état des services municipaux | Nouveaux champs sur `MunicipalService` (`availability`, `availabilityMessage`, `availableAgainAt`, `alternative`). Modifiable par agent/admin via `PATCH /services/:idOrSlug/availability` et automatiquement renvoyé par `GET /services` et `GET /services/:slug`. |

## Chantier 5 — Rendez-vous municipaux (F39, F40)

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **F39** | Prise et gestion de rendez-vous | Entités `AppointmentSlot` (créneaux avec agent, service, dates, lieu, disponibilité, versioning optimiste) et `Appointment` (citoyen, créneau, motif, documents requis, statut `confirme`/`annule`). Consultation des créneaux `GET /appointments/slots?service=`, réservation concurrente sécurisée `POST /appointments/book/:slotId`, liste personnelle `GET /appointments/mine`, annulation `PATCH /appointments/:id/cancel` qui libère le créneau, vue agent `GET /agent/appointments`. Seed automatique de créneaux sur les 7 prochains jours. |
| **F40** | Rappels de rendez-vous et export ICS | Génération automatique d'un rappel dans les notifications (`appointment_reminder`) lorsque le RDV a lieu dans moins de 24h, déclenché à la consultation (`GET /notifications`). Export calendrier standard iCalendar via `GET /appointments/:id/ics` pour ajout direct dans un agenda. |

Détail complet des routes dans [`docs/API.md`](./API.md).

## Chantier 6 — Gestion citoyenne & Traitement des demandes (F33, F34, F49, F50, F52)

| Code | Demande | Satisfait par |
| ---- | ------- | -------------- |
| **F33** | Suppression de compte citoyen | `DELETE /me` avec confirmation du mot de passe (`password`). Nettoie ou anonymise les données liées en cascade et supprime le compte définitivement. |
| **F34** | Annuaire et gestion des comptes par les agents | `GET /agent/citizens` (liste paginée avec recherche par nom/email/quartier), `PATCH /agent/citizens/:id/status` (activation / désactivation de compte citoyen, blocage immédiat à la connexion, interdiction de modifier les comptes staff). Migration `1791100000000-AddUserIsActive.ts`. |
| **F49** | Notification au citoyen lors du changement de statut | Déclenchement automatique d'une `Notification` (`type: 'demande_statut'`) pour le citoyen dès qu'un agent change le statut de son message via `PATCH /agent/messages/:id/status`, avec lien direct `/demandes/:id` et message récapitulatif. |
| **F50** | Métriques et statistiques d'activité dans le dashboard | `GET /agent/dashboard` enrichi avec répartition des signalements par catégorie et par quartier, nombre total de soutiens citoyens cumulés, alertes actives et prochains rendez-vous municipaux. |
| **F52** | Soutien citoyen aux signalements publics | Entité `MessageSupport`, endpoint `POST /messages/:id/support` (vote/soutien citoyen avec compteur unitaire `supportCount`), et tri par popularité `GET /agent/messages?sort=supports` pour prioriser les interventions de terrain. Migration `1791110000000-AddMessageSupportsAndNotificationType.ts`. |

Détail complet des routes dans [`docs/API.md`](./API.md).
