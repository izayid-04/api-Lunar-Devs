# SCENARIOS.md — Cahier de scénarios Nova Terra

> **Référence obligatoire pour tous les agents (front et back).**
> Une fonctionnalité n'est « terminée » que si **tous ses scénarios** passent, **en production**.
> Chaque scénario se lit : **qui** → **fait quoi** → **résultat attendu**.
> Les codes (D01, F38…) sont les demandes de l'API Webcup : ils servent à la déclaration finale au jury.

Comptes de démonstration : **citoyen** (Port Stellaire, vulnérable), **agent**, **admin**, + un **nouveau compte** créé pendant le test.

---

## 0. Règles communes à TOUTES les pages

Avant de déclarer une page terminée, vérifier chacun de ces points :

- [ ] **Chargement** : un indicateur s'affiche pendant l'appel à l'API (pas d'écran figé ni de saut de mise en page).
- [ ] **Liste vide** : un message clair et une action proposée (« Vous n'avez encore aucune demande. Envoyer une demande »). Jamais une page blanche.
- [ ] **Erreur réseau ou serveur** : message compréhensible + bouton « Réessayer ». Jamais d'erreur technique brute, jamais de page cassée.
- [ ] **Succès d'une action** : confirmation claire, annoncée aux lecteurs d'écran (`aria-live`), et indication de la suite (« Voir ma demande »).
- [ ] **Non connecté** sur une page protégée : redirection vers la connexion, puis **retour automatique** à la page demandée après connexion.
- [ ] **Mauvais rôle** (citoyen sur une page agent) : redirection vers son espace avec un message, jamais de contenu agent affiché même une fraction de seconde.
- [ ] **Jeton expiré** : déconnexion propre et message « Votre session a expiré, reconnectez-vous ».
- [ ] **Retour possible** : fil d'Ariane (D15) et lien vers son espace sur chaque page interne.
- [ ] **Double clic** sur un bouton d'envoi : une seule action enregistrée (bouton désactivé pendant l'envoi).
- [ ] **Données réelles uniquement** : aucune donnée inventée affichée comme réelle.
- [ ] **Langage simple** (D13) : aucun jargon dans les boutons, menus et messages.
- [ ] **Accessibilité** : utilisable au clavier (F41), libellés et erreurs accessibles (F21, F42), pas d'information par la couleur seule (F43), lisible à 200 % et 400 % (F44).
- [ ] **Mobile** : utilisable sur un écran de téléphone (320 px), sans défilement horizontal.
- [ ] **Les deux thèmes** (sombre et clair) et le **mode contraste élevé** restent lisibles.

---

## 1. Visiteur et page d'accueil — D07, D15, D13, D18, F28, F46

- [ ] Visiteur → arrive sur l'accueil → comprend en quelques secondes qu'il est sur la plateforme de la ville et ce qu'il peut y faire.
- [ ] Visiteur → voit les **accès rapides** aux services principaux, avec les services prioritaires en premier (F28).
- [ ] Visiteur → voit un accès direct **« Urgences »** (hôpital, sécurité) sans chercher (F46).
- [ ] Visiteur → voit le **bandeau des alertes générales** en cours (D18) et peut en lire le détail.
- [ ] Visiteur → voit les dernières **annonces** et peut en ouvrir une.
- [ ] Visiteur → voit clairement **« Créer mon compte »** et **« Me connecter »**.
- [ ] Citoyen connecté → arrive sur l'accueil → le bouton principal devient **« Accéder à mon espace »**.
- [ ] Toute page interne → fil d'Ariane cliquable (D15).

---

## 2. Inscription et connexion — D01, D03, F37, F54

**Inscription (D01)**
- [ ] Visiteur → remplit le formulaire correctement → compte créé, connecté, arrive dans son espace avec un message de bienvenue.
- [ ] Champ vide ou email invalide → message d'erreur **à côté du champ**, résumé en haut, focus sur le premier champ en erreur (F42).
- [ ] Email déjà utilisé → message clair, sans révéler d'information sensible.
- [ ] Mot de passe trop faible → les règles sont **affichées avant** de valider, pas seulement après l'échec.
- [ ] Le rôle est toujours « citoyen » (impossible de s'inscrire agent).

**Connexion (D03)**
- [ ] Citoyen → bons identifiants → arrive dans son espace, son nom est affiché.
- [ ] Mauvais mot de passe → message générique (« Email ou mot de passe incorrect »).
- [ ] 5 échecs → message de verrouillage clair avec **l'heure de déverrouillage** (réponse 429) (F37).
- [ ] Email inexistant, 5 échecs → **même message** que pour un compte existant (F37).
- [ ] Compte désactivé par un agent → message générique, connexion refusée (F34).
- [ ] Connexion depuis un nouvel appareil → notification « Nouvelle connexion depuis… » dans la cloche (F54).
- [ ] Déconnexion → retour à l'accueil public, les pages protégées ne sont plus accessibles (bouton « Précédent » compris).
- [ ] Rechargement de la page en étant connecté → reste connecté.

---

## 3. Mon espace et mon profil — D03, D12, F35, F33, F37, F55, F56

**Espace personnel (D03)**
- [ ] Citoyen → ouvre son espace → voit ses vraies informations : alertes qui le concernent, demandes en cours, prochain rendez-vous, dernières annonces.
- [ ] Nouveau citoyen sans aucune donnée → chaque bloc affiche un état vide avec une action.

**Première connexion (D12, F35)**
- [ ] Nouveau citoyen → première connexion → invité à **compléter son profil** (quartier, langue, situation de vulnérabilité), avec possibilité de le faire plus tard.
- [ ] Une courte **liste de démarrage** : compléter mon profil, trouver un service, envoyer ma première demande. Chaque étape se coche quand elle est faite.
- [ ] Des **indications courtes au bon moment** (infobulle ou bandeau) sur les premières actions, faciles à fermer et qui ne reviennent pas une fois fermées.

**Modifier son profil**
- [ ] Citoyen → modifie prénom, nom, quartier, langue, vulnérabilité → enregistre → confirmation, les changements sont visibles immédiatement **et après rechargement**.
- [ ] Citoyen → modifie puis clique **Annuler** → rien n'est enregistré.
- [ ] Changer de quartier → les alertes ciblées affichées changent en conséquence.

**Sécurité**
- [ ] Changer son mot de passe : mot de passe actuel + nouveau + confirmation → succès, notification « mot de passe modifié ».
- [ ] Mot de passe actuel faux → erreur claire. Confirmation différente → erreur avant envoi.
- [ ] Voir sa **dernière connexion** et ses **tentatives échouées** récentes (F37).

**Mes données (F55, F56)**
- [ ] Télécharger un **récapitulatif lisible de mes demandes** (totaux par statut + liste) (F56).
- [ ] Télécharger **toutes mes données personnelles** dans un format lisible, pas un JSON brut incompréhensible (F55).

**Supprimer son compte (F33)**
- [ ] Citoyen → « Supprimer mon compte » → explication de ce qui sera supprimé → confirmation **par mot de passe** → compte supprimé, déconnecté, retour à l'accueil avec un message.
- [ ] Mauvais mot de passe → refus, compte intact.
- [ ] Annuler à l'étape de confirmation → rien ne se passe.
- [ ] Après suppression → impossible de se reconnecter avec ce compte.

---

## 4. Rôles et accès — D08, D09

- [ ] Citoyen → menu : uniquement les pages citoyennes, aucun lien agent ou admin.
- [ ] Agent → menu : espace citoyen + espace agents, pas d'« Administration ».
- [ ] Admin → menu : tout, y compris « Administration ».
- [ ] Citoyen → tape `/agent` ou `/admin` dans l'adresse → redirigé, jamais de contenu agent visible.
- [ ] Agent → tape `/admin` → redirigé.
- [ ] Chaque espace affiche clairement le rôle de la personne connectée (badge).
- [ ] Les liens de l'espace agents restent **dans** l'espace agents (la barre latérale ne disparaît pas).

---

## 5. Services municipaux — D05, F28, F32, F38, F45, F46

**Consulter (D05)**
- [ ] Visiteur → liste des services → ouvre un service → voit description, horaires, contact, adresse, quartier.
- [ ] Les **services prioritaires** apparaissent en premier, visiblement mis en avant (F28).

**Chercher (F32)**
- [ ] Recherche « santé » → les services de santé apparaissent.
- [ ] Filtre par catégorie et par quartier, combinables, avec possibilité de tout réinitialiser.
- [ ] Recherche sans résultat → message clair + suggestion (« Réinitialiser les filtres »).

**Localiser (F45, F46)**
- [ ] Chaque service affiche son **adresse** et son emplacement sur la carte des quartiers.
- [ ] Bouton **« Urgences »** → liste immédiate des services d'urgence avec adresse et contact (F46).

**Disponibilité (F38)**
- [ ] Service en maintenance ou incident → badge avec **icône + texte**, message, date de retour prévue, **alternative** proposée.
- [ ] Sur un service indisponible → impossible de commencer une démarche ou de prendre rendez-vous, avec l'explication et l'alternative.
- [ ] Agent → change la disponibilité d'un service → visible immédiatement côté public.

**Agir depuis un service**
- [ ] Bouton **« Prendre rendez-vous »** → ouvre la prise de rendez-vous pour ce service.
- [ ] Bouton **« Contacter ce service »** → formulaire de demande pré-rempli avec ce service.

---

## 6. Demandes et signalements — D04, D16, F26, D11, F25, F49, F52

**Envoyer une demande (D04, D16)**
- [ ] Citoyen → envoie une question → confirmation immédiate avec la **référence NT-xxxx** et un lien vers la demande.
- [ ] Champs obligatoires vides → erreurs accessibles, rien n'est envoyé.
- [ ] Visiteur non connecté → invité à se connecter, puis revient au formulaire.

**Signaler un problème (F25)**
- [ ] Citoyen → « Signaler un problème » → choisit une catégorie (libellés lisibles : Voirie, Éclairage, Propreté, Eau, Autre), un quartier, un lieu précis, une description → confirmation avec référence.
- [ ] Signalement sans lieu ou sans quartier → refusé avec message clair.

**Suivre (F26, D11)**
- [ ] Citoyen → « Mes demandes » → toutes ses demandes, avec statut (icône + texte), plus récentes d'abord, filtrables (F26).
- [ ] Citoyen → ouvre une demande → **chronologie des étapes** : envoyée, prise en charge, traitée, avec dates et notes de l'agent (D11).
- [ ] Citoyen → ouvre la demande d'un autre (en changeant l'adresse) → « Demande introuvable ».

**Être informé (F49)**
- [ ] Agent change le statut → le citoyen reçoit une notification → un clic l'amène **sur la demande** (page existante).

**Soutenir (F52)**
- [ ] Citoyen → voit les signalements des autres habitants → **« Soutenir »** → le compteur augmente, le bouton indique « Vous soutenez ».
- [ ] Re-cliquer → retire son soutien.
- [ ] Impossible de soutenir sa propre demande, et un seul soutien par personne.

---

## 7. Rendez-vous — F39, F40

- [ ] Citoyen → choisit un service → voit les **créneaux libres** groupés par jour → en choisit un → saisit le motif → voit les **documents à préparer** → confirme.
- [ ] Confirmation **sans ambiguïté** : date en toutes lettres, heure, durée, lieu, agent, documents à apporter.
- [ ] Créneau pris entre-temps par quelqu'un d'autre → message clair, retour à la liste des créneaux à jour (409).
- [ ] Aucun créneau disponible → message + alternative (autre service, contacter le service).
- [ ] « Mes rendez-vous » → à venir et passés, séparés.
- [ ] **Annuler** un rendez-vous → confirmation demandée → annulé, le créneau redevient libre.
- [ ] **« Ajouter à mon agenda »** → téléchargement d'un fichier `.ics` qui s'ouvre correctement dans un agenda (F40).
- [ ] Rendez-vous dans moins de 24 h → **rappel** visible dans les notifications (F40).
- [ ] Agent → voit les rendez-vous de son service.

---

## 8. Annonces — D06, F30

- [ ] Visiteur → liste des annonces, plus récentes d'abord → ouvre une annonce → contenu complet.
- [ ] Agent → crée une annonce → visible côté public immédiatement.
- [ ] Agent → modifie, puis supprime une annonce (confirmation avant suppression).
- [ ] Agent → coche **« Annonce importante »** → les citoyens reçoivent une notification (F30).

---

## 9. Alertes et notifications — D18, F29, F30, F31

**Bandeau et page Alertes**
- [ ] Alerte générale (D18) → bandeau visible sur toutes les pages, pour tout le monde, avec **quoi faire**.
- [ ] Alerte ciblée sur Port Stellaire (F29) → visible pour le citoyen de démo, **invisible** pour un citoyen du Centre-Ville.
- [ ] Alerte pour les personnes vulnérables (F31) → visible pour le citoyen de démo uniquement si « vulnérable » est coché dans son profil.
- [ ] La gravité est indiquée par **icône + texte** (pas seulement la couleur). Une alerte urgente est annoncée aux lecteurs d'écran.
- [ ] Le bandeau peut être réduit sans disparaître définitivement pour une alerte urgente.
- [ ] Page « Alertes » → historique, avec alertes en cours et terminées distinguées.

**Gestion par les agents**
- [ ] Agent → crée une alerte : titre, message, consignes, gravité, cible (tous / quartier / vulnérables), dates.
- [ ] Cible « quartier » sans quartier choisi → erreur avant envoi.
- [ ] Agent → **« Générer des recommandations (IA) »** → le champ se remplit, l'agent peut **relire et modifier** avant de publier ; un indicateur de chargement s'affiche ; si l'IA échoue, message clair et saisie manuelle toujours possible (F31).
- [ ] Agent → **termine** une alerte → elle disparaît du bandeau mais reste dans l'historique.
- [ ] Admin uniquement → **supprime définitivement** une alerte.

**Cloche de notifications**
- [ ] Compteur de non lues ; ouvrir une notification la marque comme lue et mène vers la bonne page.
- [ ] Aucune notification → état vide clair.

---

## 10. Espace agents — D19, D17, F22, F50, F34, F37, F47, F48, F36, F51

**Tableau de bord (D19, D17, F50)**
- [ ] Agent → voit **immédiatement** le nombre de demandes en attente (D17).
- [ ] Indicateurs réels : demandes par statut, signalements par catégorie et par quartier, rendez-vous à venir, alertes actives, soutiens (F50). Lisibles sans couleur seule.
- [ ] Flux de l'API Nova Terra : demandes reçues, vague en cours, temps avant la prochaine (D19). Si l'API Webcup est indisponible, message clair.

**Traiter les demandes (F22)**
- [ ] Onglets par statut avec compteurs ; filtres par type (question, signalement, données personnelles) ; tri par soutiens.
- [ ] Agent → ouvre une demande → change le statut **avec une note** → le citoyen la voit dans la chronologie.
- [ ] Ouvrir une demande donne le détail complet (citoyen, lieu, catégorie, historique).

**Comptes citoyens (F34)**
- [ ] Agent → cherche un citoyen par nom ou email → le désactive (avec confirmation) → le citoyen ne peut plus se connecter → le réactive.
- [ ] Agent → ne peut pas désactiver un autre agent ni un admin.

**Sécurité (F37)**
- [ ] Tableau des comptes ciblés par des tentatives échouées, compréhensible.

**Historique des actions (F47, F48)**
- [ ] Chaque action sensible apparaît : **qui**, **quoi**, **quand**, **sur quel élément**, en langage clair.
- [ ] Filtres par auteur, type d'action, période ; pagination.

**Transports (F36), données personnelles (F51), services**
- [ ] Agent → modifie l'état d'une ligne **depuis l'espace agents** → visible sur la page publique.
- [ ] Agent → traite une demande RGPD → répond → le citoyen voit la réponse dans son espace.
- [ ] Agent → modifie la disponibilité et la mise en avant d'un service.

---

## 11. Administration — D08, D09

- [ ] Admin → page **« Administration »** avec uniquement de vraies fonctions réservées.
- [ ] Admin → liste de tous les comptes, filtrable par rôle.
- [ ] Admin → **crée un compte agent** → l'agent peut se connecter et accède à l'espace agents.
- [ ] Admin → change le rôle d'un compte ; ne peut pas se retirer à lui-même le rôle admin.
- [ ] Admin → désactive / réactive un agent.
- [ ] Admin → supprime définitivement une alerte.
- [ ] Admin → crée, modifie ou supprime un service.
- [ ] Toutes ces actions apparaissent dans l'historique des actions.

---

## 12. Transports — F36

- [ ] Visiteur → page Transports : toutes les lignes sur un écran, état du trafic (icône + texte), fréquence, horaires, arrêts, prochains départs.
- [ ] Recherche par code, quartier ou terminus ; filtre par type.
- [ ] Ligne perturbée → message d'information visible sans clic supplémentaire.
- [ ] La page publique est en **lecture seule pour tous**, la gestion se fait dans l'espace agents.

---

## 13. Données personnelles — F51, F55, F56

- [ ] Visiteur → page **« Vos données »** : quelles données, pourquoi, combien de temps, quels droits, en langage simple.
- [ ] Citoyen → fait remonter une inquiétude (motif + message) → confirmation avec **référence RGPD-…**.
- [ ] Citoyen → suit ses demandes RGPD et voit la **réponse de la ville** dans son espace.
- [ ] Liens vers l'export de ses données et le récapitulatif de ses demandes (F55, F56).

---

## 14. Accessibilité — F21, F23, F24, F41, F42, F43, F44, D20

- [ ] Premier appui sur Tab → lien **« Aller au contenu principal »** (F21).
- [ ] Parcours complet **au clavier seul** : inscription → demande → suivi → rendez-vous → déconnexion, sans souris (F41, D20).
- [ ] Panneau d'accessibilité : **taille du texte** (3 niveaux) sans chevauchement (F24), **contraste élevé** (F23), **réduire les animations** ; réglages conservés après rechargement.
- [ ] Lecteur d'écran : chaque bouton a un nom, chaque champ un libellé, chaque erreur est annoncée (F21, F42).
- [ ] Aucune information transmise par la couleur seule : statuts, gravités, erreurs (F43).
- [ ] Zoom navigateur 200 % et 400 % : rien de coupé, pas de défilement horizontal (F44).
- [ ] Toutes les nouvelles pages (audit, transports, RGPD, rendez-vous, profil) respectent ces règles, pas seulement les anciennes.

---

## 15. Multilingue — D14, F27 (seulement si le temps le permet)

- [ ] Sélecteur de langue visible partout ; le choix est conservé.
- [ ] Menus, boutons, formulaires et messages traduits (D14).
- [ ] Contenus essentiels des services et démarches disponibles dans une autre langue (F27).
- [ ] La langue préférée du profil est appliquée à la connexion.