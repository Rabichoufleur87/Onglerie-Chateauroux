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
assets/js/app.js            Menu mobile, année du copyright
assets/img/                  Photos du salon / des réalisations
```

Aucune étape de build n'est nécessaire : ouvrir `index.html` dans un navigateur
suffit pour prévisualiser le site, ou le déployer tel quel (GitHub Pages, Netlify,
hébergement mutualisé...).

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
   « Réalisations ») et pour la photo du salon sur `a-propos.html`
   (`.carte-placeholder`).

## Informations à compléter

Plusieurs informations n'ont pas pu être confirmées publiquement et restent en
placeholder dans le site (marquées « à venir ») :

- Adresse exacte du salon
- Numéro de téléphone
- Horaires d'ouverture détaillés
- Tarifs précis par prestation
- SIRET / mentions légales complètes
- Lien Instagram (le compte `@fnails.chtrx` est mentionné mais non lié)

Confirmées et déjà intégrées :
- Ville : Châteauroux
- TikTok : [@fnails.chtrx_](https://www.tiktok.com/@fnails.chtrx_)
- Prise de rendez-vous en ligne : [iarabeauty.com/fr/pro/fnailschtrx](https://iarabeauty.com/fr/pro/fnailschtrx)
- Prestations : pose gel, pose américaine, gainage, nail art, soin des pieds
