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

## Prochains blocs

À compléter au fur et à mesure que les blocs suivants du sujet Nova
Terra sont traités — un tableau par bloc, même format (code → demande →
endpoint(s)/fichier(s) qui la satisfont).
