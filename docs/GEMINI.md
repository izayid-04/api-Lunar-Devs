# GEMINI.md — Front Nova Terra (dépôt `Lunar-Devs`)

> Fichier de passation. Tu reprends un projet en cours, en pleine compétition.
> Lis ce fichier en entier, puis `docs/DEPLOIEMENT.md`, `docs/DEMANDES.md` et `docs/API.md` avant de toucher au code.

---

## 1. Contexte : un hackathon de 24 h, chrono en cours

- Concours **24h by Webcup – Comores 2026**, équipe **Lunar Devs**, candidat solo : **Izayid Ali**.
- Démarrage : samedi 3 octobre 2026 vers 9h. **Fin : dimanche 4 octobre à 9h00 (heure des Comores, UTC+3).** À la fin, les serveurs sont coupés et l'application est figée.
- Sujet : la **plateforme numérique de la ville de Nova Terra**, une ville fondée sur une autre planète. Utilisée par des **citoyens**, des **agents municipaux** et des **administrateurs**.
- Les fonctionnalités à réaliser arrivent sous forme de **demandes** (codes D01, F21…) diffusées par une API officielle Webcup, **par vagues toutes les heures (vers h25)**. Chaque demande rapporte des XP. Les demandes récentes ont un bonus de temps.
- **Le jury vérifie une par une les fonctionnalités déclarées.** Il teste l'application dans le navigateur. Conséquences :
  - **aucune donnée factice** dans une page qui prétend être fonctionnelle ;
  - **aucun lien ou bouton qui ne mène nulle part** ;
  - une fonctionnalité à moitié finie ne rapporte rien et peut casser le reste.
- Le jury note aussi : qualité visuelle, expérience utilisateur, finition, cohérence, **éco-conception (Ecoindex)**.

### Calendrier jusqu'à la fin

| Heure (Comores) | Règle |
|---|---|
| jusqu'à 5h00 | développement des demandes par ordre de priorité |
| 5h00 → 8h00 | **plus aucune nouvelle fonctionnalité** : tests, corrections, finition |
| **8h00 au plus tard** | dernier déploiement, vérifié en production. Ensuite on ne touche plus à rien. |

---

## 2. Architecture

- **Ce dépôt** : front **Next.js 16 (App Router)**, TypeScript, **Tailwind 4**, **shadcn/ui**, `motion`, `cobe` (globe WebGL léger), `next-themes`.
- **API** : dépôt séparé `api-Lunar-Devs`, **NestJS + TypeORM + MySQL**, en production sur
  `https://api.lunardevs.lescomores.webcup.hodi.cloud`
- Le front appelle l'API via la variable **`NEXT_PUBLIC_API_URL`**.
- **Authentification** : JWT renvoyé par `POST /auth/login`, envoyé en en-tête `Authorization: Bearer <token>`. Profil via `GET /me`. Inspecte le code existant pour voir où le jeton est stocké et comment les appels sont faits : **réutilise ce mécanisme, n'en crée pas un second.**
- **Le contrat de l'API est dans `docs/API.md`.** C'est la seule source de vérité. Si une route dont tu as besoin n'existe pas, **ne l'invente pas** : note le besoin dans `docs/BESOINS-API.md` (route, méthode, rôle, corps, réponse attendue) et préviens Izayid.
- Production front : `https://lunardevs.lescomores.webcup.hodi.cloud`

### Rôles

| Rôle | Accès |
|---|---|
| `citizen` | espace personnel, démarches, services, annonces, alertes |
| `agent` | espace de travail agents (tableau de bord, messages, flux API Webcup, annonces, alertes, comptes citoyens) |
| `admin` | tout ce que fait l'agent **+ un onglet de plus** (fonctions sensibles, gestion des agents). Pas d'interface séparée. |

La barre latérale n'affiche **que des pages qui existent**, selon le rôle. La vraie protection est dans l'API ; le front gère l'expérience (redirection si le rôle ne convient pas).

---

## 3. Déploiement (Hodifly) — pièges déjà rencontrés

- Le déploiement est automatique : **push sur `main` → Hodifly installe, build et publie.** Un build front prend **2 à 4 minutes**.
- Hodifly force Next.js en **mode standalone**. Le fichier de démarrage est **`server.js` généré par Next**. **Pas de serveur personnalisé** (pas de `server.cjs` côté front). Le script `start` reste `next start`.
- Le serveur limite le nombre de processus par compte : **`childConcurrency: 1` doit rester dans `pnpm-workspace.yaml`.**
- **Un seul déploiement à la fois** (front ou API). Attendre « finished » avant de pousser autre chose.
- Le serveur a une vieille glibc (2.28) : pas de compilateur natif, build plus lent. **N'ajoute aucune dépendance à code natif.**
- **Ne pousse jamais sans l'accord d'Izayid.** C'est lui qui pousse et vérifie la production.
- Après chaque déploiement : vérifier la production dans le navigateur.

---

## 4. Design : VALIDÉ, ne pas le refaire

Le design est terminé et validé. **Gel du design** : on n'ajoute plus d'éléments décoratifs, on ne change pas l'identité. On fait seulement des corrections et on construit les nouvelles pages **dans le même style**.

- **Thème « Tangerine »** (preset oklch dans les variables shadcn) : fond sombre chaud, orange tangerine en couleur d'action, ambre en secondaire, turquoise en contrepoint froid.
- Sombre par défaut, clair en variante. **Toutes les couleurs passent par les variables de thème. Aucune couleur en dur.**
- **Texte sombre sur les boutons orange/rouge** (contraste corrigé, ne pas revenir en arrière).
- Statuts : nouveau = rouge corail, en cours = ambre, traité = turquoise.
- Composants : **shadcn/ui** (réutiliser ceux déjà présents). Pas de grosse bibliothèque UI.
- L'espace en bas de page pour le dock flottant est **centralisé dans `layout.tsx`** : ne pas ajouter de padding en double dans les pages.
- Animations : légères, avec pause possible, **respect de `prefers-reduced-motion`**.
- Images : légères (WebP), toutes générées (pas de droits tiers). Pas de vidéo, pas de 3D lourde.
- Point connu non résolu : le texte orange seul (`text-primary`) sur fond clair est autour de 3:1. Le **mode contraste élevé (F23)** est l'occasion de le régler.

---

## 5. État des demandes côté front (mis à jour à 17h00)

### Organisation : deux agents front en parallèle

- **Agent 1 — accessibilité**, sur `main` : passe de vérification F21, puis la vague 6 (D13, D20, F41, F42, F43, F44).
- **Agent 2 — fonctionnalités**, sur la branche **`alertes`** : alertes et notifications, puis les écrans des fonctionnalités déjà prêtes dans l'API (F38, F39, F40, F37…).
- Chacun fait des **modifications ciblées** et ne réécrit pas les fichiers de l'autre. Si tu dois modifier un fichier partagé (`layout.tsx`, en-tête, dock), fais un changement minimal et signale-le dans ton rapport.

Fait :
- **F21, F23, F24** : panneau d'accessibilité (taille du texte, contraste élevé, animations réduites, lien « Aller au contenu »). Une passe de vérification F21 sur tout le site est en cours (agent 1).
- D01, D03, D08, D09 : inscription, connexion, espace personnel, rôles, protection des pages
- D19, F22, D17 : espace agents branché sur l'API (tableau de bord, flux Webcup, messages par statut avec compteurs)
- D04, D16, F26 : formulaire de contact avec confirmation (référence NT-xxxx) et historique « Mes demandes »
- D05 : services (liste, détail, carte des quartiers) ; recherche et filtres en place (F32, F28 à confirmer avec les champs de l'API)
- D06 : annonces publiques + gestion dans l'espace agents
- D15 : fil d'Ariane
- D07 : accueil avec accès rapides, services principaux, annonces récentes

`docs/DEMANDES.md` est la liste de référence : tiens-la à jour.

---

## 6. À faire, par ordre de priorité

Les routes nécessaires arrivent progressivement dans l'API (voir `docs/API.md`). Si une route n'existe pas encore, passe au point suivant et reviens plus tard.

### File de l'agent 1 — accessibilité (sur `main`)

A. **Passe F21** (en cours) : `aria-label` sur tous les boutons à icône seule, `alt` sur les images, description alternative du globe et du carrousel, landmarks sur toutes les mises en page, un seul `h1` par page, confirmations annoncées via `aria-live`, focus gardé et rendu par les modales.

B. **Vague 6 — inclusion (3 720 XP)** :
   - **D13** : remplacer le jargon des libellés d'action et de navigation par des mots simples (« Cockpit » → « Mon espace », « Sas de téléportation » → « Accès rapides », « Transmissions » → « Mes demandes »…). Garder l'ambiance spatiale seulement dans les titres décoratifs. Infobulle d'explication pour les rares termes propres à Nova Terra (Dôme, Maglev).
   - **F41** : tout le site au clavier seul : ordre de tabulation logique, focus visible, aucun piège, dock, sidebar, menus, modales et carrousel au clavier, liste de boutons comme alternative au globe.
   - **F42** : tous les formulaires : libellés visibles, champs obligatoires annoncés autrement que par la couleur, `aria-invalid` + `aria-describedby` sur les erreurs, résumé d'erreurs en haut, `autocomplete` sur les champs d'identité.
   - **F43** : aucune information transmise uniquement par la couleur : statuts et gravités avec icône + texte, liens soulignés, erreurs avec icône.
   - **F44** : zoom navigateur à 200 % et 400 % (et largeur 320 px) sans défilement horizontal, chevauchement ni contenu coupé.
   - **D20** : vérifier les parcours complets (inscription → connexion → démarche → suivi → déconnexion) avec toutes ces contraintes. Pas de version « accessible » séparée.

### File de l'agent 2 — fonctionnalités (sur la branche `alertes`)

Les routes de l'API ci-dessous sont **déjà en production**. Leur contrat exact est dans `docs/API.md`.

1. **Alertes et notifications — D18, F29, F30, F31 (3 080 XP)** :
   - bandeau d'alerte global visible sur toutes les pages, selon la gravité, avec « quoi faire » ;
   - cloche de notifications (non lues, marquer comme lu) ;
   - espace agents : créer / modifier / **terminer** une alerte (`PATCH /alerts/:id/terminate`) ; suppression réservée à l'admin. Cible : tous, un quartier, personnes vulnérables. Bouton « Générer des recommandations (IA) » (`POST /agent/alerts/ai-recommendations`) qui remplit le champ, relu par l'agent avant publication, avec état de chargement et message clair si l'IA échoue ;
   - page publique « Alertes » (historique, `GET /alerts`) ;
   - case « Annonce importante » (`isImportant`) dans le formulaire d'annonce ;
   - bandeau en `role="alert"` pour les alertes urgentes, `aria-label` sur la cloche.
2. **Disponibilité des services — F38 (600 XP), rapide :** badge de statut (disponible / maintenance / incident, avec icône + texte) sur les services, message, date de retour, alternative ; empêcher de démarrer une démarche ou un rendez-vous sur un service indisponible. Agents : modifier la disponibilité (`PATCH /services/:idOrSlug/availability`).
3. **Rendez-vous — F39, F40 (900 XP) :** choisir un service puis un créneau libre (`GET /appointments/slots?service=`), réserver (`POST /appointments/book/:slotId`, gérer le 409 « créneau déjà pris » avec un message clair), confirmation sans ambiguïté (date, heure, lieu, agent, documents à préparer), « Mes rendez-vous » (`GET /appointments/mine`), annulation, bouton « Ajouter à mon agenda » (fichier `.ics` **téléchargé avec fetch + le jeton**, pas un simple lien). Le rappel apparaît dans les notifications. Agents : rendez-vous de leur service (`GET /agent/appointments`).
4. **Sécurité des connexions — F37 (900 XP) :** sur la page de connexion, message clair en cas de verrouillage (réponse **429**, avec l'heure de déverrouillage) ; dans l'espace citoyen, dernière connexion et tentatives échouées (`GET /me/security`) ; tableau « Sécurité » pour agents/admin (`GET /agent/security/targeted-accounts`).
5. **Profil et accueil des nouveaux — D12, F35 :** compléter son profil (quartier, langue, vulnérabilité ; `PATCH /me`) à la première connexion, petite checklist de démarrage, indications contextuelles courtes.
6. **Suivi et signalement — D11, F25** (dès que l'API les livre) : chronologie des étapes d'une demande ; formulaire de signalement (quoi, quartier, lieu précis, catégorie).
7. **Comptes — F33, F34** (dès que l'API les livre) : supprimer son compte (confirmation par mot de passe) ; gestion des comptes citoyens par les agents.
8. **Transports — F36** (dès que l'API le livre).
9. **Multilingue — D14, F27 (en dernier).**

---

## 7. Méthode de travail

- **Un point à la fois.** Après chaque point : `pnpm build` + `pnpm lint`, mise à jour de `docs/DEMANDES.md` (code de demande → pages concernées → comment le tester), **rapport court à Izayid**.
- Ne casse jamais une fonctionnalité qui marche. En cas de doute, demande.
- Aucun secret dans le code ni dans Git.
- Ne crée pas de serveur personnalisé, ne touche pas à `pnpm-workspace.yaml` (sauf pour garder `childConcurrency: 1`).
- **Ne pousse pas** : Izayid valide et pousse lui-même.

### Rapport obligatoire après chaque point

Izayid transmet tes rapports à la personne qui pilote le projet. Termine **chaque point** par un rapport dans ce format exact :

```
RAPPORT — <codes des demandes> — <titre du point>
Statut : terminé / partiel (préciser ce qui manque)
Pages et composants ajoutés ou modifiés : <liste>
Routes API utilisées : <liste>
Comment le tester : <parcours exact, avec le rôle à utiliser>
Build et lint : OK / erreurs
Besoins côté API non couverts : <liste ou "aucun">
Prêt à pousser : oui / non
```