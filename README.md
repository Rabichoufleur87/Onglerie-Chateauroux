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
assets/css/style.css      Styles
assets/js/app.js            Menu mobile, thème, formulaire de rendez-vous
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

## Ajouter les photos

1. Déposer les fichiers images dans `assets/img/`.
2. Dans `galerie.html`, repérer le bloc `<!-- GALERIE:DEBUT -->` / `<!-- GALERIE:FIN -->`
   et remplacer une vignette `galerie-vignette--attente` par :
   ```html
   <div class="galerie-vignette">
     <img src="assets/img/nom-du-fichier.jpg" alt="Description de la pose">
   </div>
   ```
3. Faire de même pour la vignette de la page d'accueil (`index.html`, section
   « Réalisations »).

## Informations à compléter

Il reste peu de choses à compléter :

- Nom de la responsable de la publication (mentions légales)
- Lien Instagram (le compte `@fnails.chtrx` est mentionné mais non lié)
- Connexion Google Calendar (`RDV_WEBAPP_URL`, voir section ci-dessus)

Confirmées et déjà intégrées :
- Adresse : 71 rue de la Poste, 36000 Châteauroux
- Téléphone : 06 58 81 11 98
- Horaires : 9h-13h et 14h-19h, sur rendez-vous
- SIRET : 943 481 648 00013
- Email : fnails.chtrx@gmail.com
- TikTok : [@fnails.chtrx_](https://www.tiktok.com/@fnails.chtrx_)
- Tarifs des 17 prestations (pose américaine, pose capsules + gel, gainage,
  dépose, pédicure)
- Prise de rendez-vous directement sur le site (`contact.html#rdv`)
