# Fnails.chtrx — Site vitrine

Site vitrine statique (HTML/CSS/JS, sans build) pour l'onglerie **Fnails.chtrx**,
à Châteauroux.

## Structure

```
index.html            Accueil
prestations.html       Prestations & tarifs
galerie.html            Galerie
a-propos.html            À propos
contact.html               Contact
mentions-legales.html        Mentions légales
politique-de-confidentialite.html  Confidentialité (RGPD) & cookies
404.html                     Page d'erreur « introuvable »
assets/css/style.css      Styles
assets/fonts/               Polices hébergées sur le site (licence OFL)
assets/js/app.js            Menu, thème, apparitions, diaporama, formulaire de RDV
assets/img/                  Photos du salon / des réalisations
google-apps-script/Code.gs   Backend Google Calendar (voir plus bas)
```

Aucune étape de build n'est nécessaire : ouvrir `index.html` dans un navigateur
suffit pour prévisualiser le site, ou le déployer tel quel (GitHub Pages, Netlify,
hébergement mutualisé...).

## Formulaire de prise de rendez-vous

Le formulaire est sur `contact.html` (ancre `#rdv`). Il a deux modes de
fonctionnement, contrôlés par la constante `RDV_WEBAPP_URL` en haut de
`assets/js/app.js` :

- **Tant que `RDV_WEBAPP_URL` est vide** (mode actuel) : au clic sur
  « Envoyer la demande », le client mail du visiteur s'ouvre avec un email
  pré-rempli adressé à `RDV_EMAIL` (déjà réglée sur `fnails.chtrx@gmail.com`).
  Un bouton « Copier le texte » sert de secours si aucun client mail n'est
  configuré sur l'appareil.
- **Une fois `RDV_WEBAPP_URL` renseignée** : chaque demande est envoyée en
  temps réel au script, qui vérifie qu'aucun événement n'existe déjà sur ce
  créneau avant de créer l'événement (prestation, date, heure, nom,
  téléphone, email du client) dans l'agenda Google Calendar. Si le créneau
  vient d'être pris par quelqu'un d'autre, le client voit un message et doit
  choisir un autre horaire — impossible de doubler un rendez-vous.

### Activer la création automatique dans Google Calendar

1. Aller sur [script.google.com](https://script.google.com) avec le compte
   Google **de l'onglerie** (celui dont l'agenda doit recevoir les RDV) et
   créer un nouveau projet.
2. Copier le contenu de `google-apps-script/Code.gs` dans l'éditeur, à la
   place du code par défaut.
3. Menu **Déployer → Nouveau déploiement** :
   - Type : *Application Web*
   - Exécuter en tant que : *Moi*
   - Qui a accès : *Tout le monde*
4. Autoriser l'accès demandé (c'est votre propre compte Google, l'accès ne
   sort pas de chez vous).
5. Copier l'URL du Web App donnée après le déploiement.
6. Coller cette URL dans `assets/js/app.js`, dans `RDV_WEBAPP_URL`, et
   republier le site.

À partir de là, chaque demande envoyée depuis le site crée directement
l'événement dans l'agenda, sans aucune action manuelle.

### Mettre à jour le script après une modification de `Code.gs`

Le Web App est déjà déployé et son URL est en service sur le site. Si le
fichier `google-apps-script/Code.gs` change (nouvelle fonctionnalité, comme
la vérification des créneaux disponibles), il faut republier une nouvelle
version **sans changer l'URL** :

1. Ouvrir le projet sur [script.google.com](https://script.google.com).
2. Copier-coller le nouveau contenu de `Code.gs` à la place de l'ancien.
3. Menu **Déployer → Gérer les déploiements**.
4. Cliquer sur le crayon (modifier) à côté du déploiement actif.
5. Dans **Version**, choisir **Nouvelle version**, puis **Déployer**.

L'URL du Web App ne change pas : rien à modifier dans `assets/js/app.js`.

## Ajouter les photos

1. Déposer les fichiers images dans `assets/img/`.
2. Dans `galerie.html`, repérer le bloc `<!-- GALERIE:DEBUT -->` / `<!-- GALERIE:FIN -->`
   et ajouter une vignette :
   ```html
   <div class="galerie-vignette reveal">
     <img src="assets/img/nom-du-fichier.jpg" alt="Description de la pose" loading="lazy">
   </div>
   ```
3. Pour la faire apparaître dans le diaporama de l'accueil, ajouter aussi une
   `diaporama__slide` dans `index.html` (section « Réalisations ») et un bouton
   dans `diaporama__points`.

## Informations à compléter

Surlignées en rose sur le site (classe `a-completer`), à remplacer dès que possible :

- **Médiateur de la consommation** (mentions légales) : obligatoire pour vendre
  des prestations à des particuliers. Adhérer à un médiateur agréé (liste sur
  economie.gouv.fr/mediation-conso), puis indiquer son nom, son adresse et son site.
- Lien Instagram (le compte `@fnails.chtrx` est mentionné mais non lié).

Confirmées et déjà intégrées :
- Adresse : 71 rue de la Poste, 36000 Châteauroux
- Téléphone : 06 58 81 11 98
- Horaires : 9h-13h et 14h-19h, sur rendez-vous
- SIRET : 943 481 648 00013
- Gérante : Fanny Foulatier, micro-entreprise (TVA non applicable, art. 293 B du CGI)
- Email : fnails.chtrx@gmail.com
- TikTok : [@fnails.chtrx_](https://www.tiktok.com/@fnails.chtrx_)
- Tarifs des 17 prestations (pose américaine, pose capsules + gel, gainage,
  dépose, pédicure)
- Prise de rendez-vous directement sur le site (`contact.html#rdv`)

## Sécurité

- **Politique de sécurité du contenu (CSP)** dans chaque page (`<meta http-equiv>`) :
  seuls les scripts, styles, images et polices du site sont autorisés, plus les
  appels au Web App Google Apps Script. Aucun script en ligne : le choix du thème
  est dans `assets/js/theme.js`. Si vous ajoutez un service externe (carte
  intégrée, vidéo, statistiques...), il faudra l'autoriser dans la CSP de chaque page.
- **Aucune ressource tierce** au chargement (polices hébergées sur le site) :
  pas de cookie, pas de bandeau de consentement nécessaire.
- **Formulaire** : champ piège anti-robots, longueurs maximales, et surtout
  validation côté serveur dans `google-apps-script/Code.gs` (formats, horaires
  d'ouverture, date à venir, pas de lien dans le nom) avec limite de demandes
  (3 par email et par heure, 20 au total par 10 minutes).
  **Après toute modification de `Code.gs`, il faut le recopier dans l'éditeur
  Apps Script et publier une nouvelle version du déploiement** (Déployer >
  Gérer les déploiements > modifier > Nouvelle version), sinon l'ancienne
  version continue de tourner.
- Liens externes en `rel="noopener noreferrer"`, politique de référent stricte.
