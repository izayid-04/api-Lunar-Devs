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
