# 🛡️ Mesures de Sécurité de l'API Nova Terra (F69)

Ce document décrit l'ensemble des mesures de renforcement de sécurité mises en œuvre sur l'API Nova Terra, la protection qu'elles confèrent, et les procédures de vérification.

---

## 1. En-têtes HTTP de sécurité (`helmet`)
- **Ce qu'elle protège** :
  - Empêche les attaques par injection de scripts (**XSS**), détournement de clics (**Clickjacking** via `X-Frame-Options: SAMEORIGIN` / CSP), reniflage MIME (`X-Content-Type-Options: nosniff`), et fuite d'informations sur l'infrastructure (`X-Powered-By` supprimé).
- **Comment la vérifier** :
  ```bash
  curl -I http://localhost:3000/health
  ```
  Vérifier la présence des en-têtes :
  - `x-content-type-options: nosniff`
  - `x-frame-options: SAMEORIGIN`
  - Absence de l'en-tête `x-powered-by: Express`.

---

## 2. CORS Strict (Origines `FRONT_URL`)
- **Ce qu'elle protège** :
  - Restreint strictement l'exécution de requêtes cross-origin depuis un navigateur uniquement aux domaines officiels configurés dans la variable `FRONT_URL` (plus `localhost` pour le développement local). Empêche les sites tiers malveillants d'effectuer des appels API au nom d'un citoyen ou agent connecté.
- **Comment la vérifier** :
  - Requête avec une origine valide (`FRONT_URL` ou `http://localhost:3000`) :
    ```bash
    curl -H "Origin: http://localhost:3000" -I http://localhost:3000/health
    # Réponse : access-control-allow-origin: http://localhost:3000
    ```
  - Requête depuis un domaine pirate :
    ```bash
    curl -H "Origin: https://evil-site.com" http://localhost:3000/health
    # Réponse : 500, message générique (masqué par le GlobalExceptionFilter,
    # section 5) — la requête est bien bloquée, sans en-tête
    # access-control-allow-origin ; un navigateur rejette alors la réponse
    # côté client quel que soit le code HTTP renvoyé.
    ```

---

## 3. Rejet silencieux des champs superflus (`ValidationPipe` whitelist)
- **Ce qu'elle protège** :
  - Protection contre les injections de champs non prévus (**mass assignment**) : `whitelist: true` supprime silencieusement tout champ du corps de requête qui n'est pas déclaré dans le DTO avant qu'il n'atteigne le service.
  - Empêche par exemple un utilisateur malveillant de s'attribuer un rôle lors de l'inscription : un champ `role` envoyé sur `POST /auth/register` est simplement ignoré, jamais transmis au service.
  - `forbidNonWhitelisted` (qui ferait échouer la requête avec `400` au lieu d'ignorer le champ) a été **volontairement omis** : à quelques heures de la fin du hackathon, le risque qu'un appel du front envoie un champ superflu légitime (et se voie bloqué entièrement) dépasse le bénéfice sécurité, alors que `whitelist` seul neutralise déjà le risque de mass assignment.
- **Comment la vérifier** :
  ```bash
  curl -X POST http://localhost:3000/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@nova.local","password":"Password123!","firstName":"Test","lastName":"User","role":"admin"}'
  # Doit répondre 201 (inscription réussie) avec un rôle "citizen" dans la
  # réponse — le champ "role" envoyé est ignoré, pas appliqué.
  ```

---

## 4. Limite de taille des requêtes HTTP (Payload limits)
- **Ce qu'elle protège** :
  - Protection contre les dénis de service (**DoS**) par saturation de mémoire : les requêtes JSON et formulaires URL-encoded sont limitées à **2 Mo** (`express.json({ limit: '2mb' })`).
- **Comment la vérifier** :
  - L'envoi d'un corps de requête dépassant 2 Mo est automatiquement rejeté avant d'atteindre un contrôleur (réponse `500` au message générique, masquée par le `GlobalExceptionFilter` — voir section 5 ; le corps n'est jamais traité ni stocké).

---

## 5. Aucune trace d'erreur technique ni stack trace exposée (`GlobalExceptionFilter`)
- **Ce qu'elle protège** :
  - Évite la divulgation d'informations sensibles sur l'architecture, la version des dépendances, les chemins locaux du serveur ou les requêtes SQL internes (`information disclosure`).
  - Toute exception 500 inattendue renvoie un message générique :
    ```json
    {
      "statusCode": 500,
      "error": "Internal Server Error",
      "message": "Une erreur interne est survenue. Veuillez réessayer ultérieurement."
    }
    ```
- **Comment la vérifier** :
  - Vérifier les réponses d'erreur pour s'assurer qu'aucun objet de stack trace (`stack`) ni trace de pilote MySQL/Node.js n'apparaît dans le corps HTTP renvoyé au client.

---

## 6. Limitation de débit globale et par route (`ThrottlerModule`)
- **Ce qu'elle protège** :
  - Prévention des attaques par force brute (**brute-force**) sur l'authentification et protection contre le scraping intensif.
  - Baseline globale : 100 requêtes / minute par IP.
  - `POST /auth/login` : restreint à 15 tentatives / minute par IP.
  - `POST /auth/register` : restreint à 10 créations / minute par IP.
  - Verrouillage automatique de compte citoyen : après 5 échecs consécutifs, le compte est verrouillé 15 minutes (`429 Too Many Requests`).
- **Comment la vérifier** :
  - Enchaîner 16 tentatives de login consécutives pour observer le retour HTTP `429 Too Many Requests`.

---

## 7. Durée de validité des jetons JWT sécurisée (8 heures)
- **Ce qu'elle protège** :
  - Durée de session de 8 heures (`expiresIn: '8h'`) permettant le confort d'évaluation pour le jury et les agents tout en limitant la fenêtre d'exposition en cas de compromission de jeton.
- **Comment la vérifier** :
  - Se connecter via `POST /auth/login` et décoder le JWT retourné (ex. via `jwt.decode` ou inspecteur de token) : le champ `exp - iat` vaut exactement 28 800 secondes (8 heures).

---

## 8. Cache mémoire de 60 secondes sur les lectures publiques (F77)
- **Ce qu'elle protège** :
  - Protège la base de données et les ressources de l'application contre les pics de charge et les attaques par déni de service (DDoS) sur les consultations de données statiques ou peu volatiles.
  - Endpoints couverts : `/services`, `/announcements`, `/alerts/active`, `/transports`, `/partners`, `/projects`.
  - Durée : 60 secondes en mémoire (`HttpCacheInterceptor`).
  - En-tête HTTP retourné : `X-Cache: HIT` avec `X-Cache-Age: Xs` lors d'un coup réussi, et `X-Cache: MISS` lors de la mise en cache initiale.
- **Comment la vérifier** :
  - Effectuer deux requêtes successives sur `GET /services` : la première produit `X-Cache: MISS`, la seconde renvoie instantanément `X-Cache: HIT`.

---

## 9. Compression des réponses HTTP (F78)
- **Ce qu'elle protège** :
  - Réduit la consommation de bande passante et accélère le temps de transfert des données vers les clients (`gzip` / `deflate` via `compression`).
  - Protège l'infrastructure réseau contre la saturation par de gros flux de données JSON.
- **Comment la vérifier** :
  - Lancer une requête avec l'en-tête `Accept-Encoding: gzip` :
    ```bash
    curl -H "Accept-Encoding: gzip" -I http://localhost:3000/services
    ```
  - Vérifier la présence de l'en-tête `Content-Encoding: gzip`.

---

## 10. Piège Honeypot et protection anti-spam (F81 & F82)
- **Ce qu'elle protège** :
  - **Champ piège `website` (F81)** : accepté par les formulaires publics (`messages`, `ideas`, `feedback`, `register`). Si un robot malveillant remplit ce champ invisible, l'API renvoie un code 201 factice sans rien enregistrer en base de données.
  - **Déduplication anti-spam (F82)** : un message identique (même auteur, même contenu) envoyé moins de 60 secondes après le précédent est immédiatement refusé avec une erreur `409 Conflict`.
  - **Rate limit renforcé** : limitation stricte à 5 soumissions par minute par adresse IP sur les formulaires de dépôt public.
- **Comment la vérifier** :
  - Tenter de renvoyer le même message dans la minute : l'API répond `409 Conflict`.
  - Envoyer un formulaire avec `"website": "http://spam.bot"` : l'API renvoie `201 Created` sans créer d'enregistrement.

---

## 11. Gestion des urgences médicales et priorisation (F80 & F86)
- **Ce qu'elle protège** :
  - **Priorité paramétrable (F80)** : `normale`, `haute`, `urgente` filtrable et triable par les agents municipaux (`?sort=priority`).
  - **Urgence médicale automatique (F86)** : lorsqu'un citoyen coche l'urgence médicale, la priorité est automatiquement assignée à `"urgente"`, une alerte immédiate est transmise à tous les agents et administrateurs, et la réponse HTTP inclut les consignes d'urgence vitales (appel 15 / SAMU).
- **Comment la vérifier** :
  - Créer un message avec `"isMedicalEmergency": true` : constater le statut `201`, la priorité `urgente`, la présence de `emergencyInstructions` et la notification reçue par les agents.
