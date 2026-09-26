/**
 * Fnails.chtrx — réception des demandes de rendez-vous du site,
 * création automatique de l'événement dans Google Calendar, email de
 * confirmation envoyé au client, et email de notification envoyé au salon.
 *
 * Installation (voir aussi README.md à la racine du dépôt) :
 * 1. Aller sur https://script.google.com et créer un nouveau projet,
 *    avec le compte Google dont l'agenda doit recevoir les rendez-vous
 *    (l'événement est créé dans l'agenda "primary" de ce compte-là,
 *    donc c'est important que ce soit le bon compte).
 * 2. Remplacer tout le contenu de Code.gs par ce fichier.
 * 3. Vérifier/adapter EMAIL_PATRON ci-dessous si besoin.
 * 4. Menu Déployer > Nouveau déploiement.
 *    - Type : Application Web.
 *    - Exécuter en tant que : Moi.
 *    - Qui a accès : Tout le monde.
 * 5. Autoriser l'accès demandé (c'est votre propre compte Google).
 * 6. Copier l'URL du Web App affichée après le déploiement.
 * 7. Coller cette URL dans assets/js/app.js, dans la constante
 *    RDV_WEBAPP_URL en haut du fichier.
 *
 * Les emails sont envoyés gratuitement via Gmail (MailApp), sans aucun
 * compte ni service tiers — juste le compte Google déjà utilisé pour
 * le script.
 *
 * Chaque nouvelle demande de rendez-vous vérifie d'abord qu'aucun
 * événement n'existe déjà sur le créneau demandé, puis crée l'événement
 * (prestation, nom, téléphone, email du client) dans l'agenda, envoie un
 * email de confirmation au client et un email de notification au salon
 * (EMAIL_PATRON). Un verrou évite que deux demandes envoyées au même
 * moment ne passent toutes les deux la vérification.
 */

var CALENDAR_ID = "primary"; // "primary" = l'agenda principal de ce compte Google

// Adresse du salon : reçoit un email à chaque nouvelle demande de RDV.
// À changer ici si besoin, sans toucher au reste du script.
var EMAIL_PATRON = "fnails.chtrx@gmail.com";

// Horaires d'ouverture, utilisés à la fois pour vérifier les demandes et
// pour proposer les créneaux disponibles dans le formulaire.
var HORAIRES = {
  matinDebut: "09:00",
  matinFin: "13:00",
  apremDebut: "14:00",
  apremFin: "19:00",
  pasCreneauxMin: 30 // intervalle entre deux créneaux proposés dans le menu déroulant
};

function doGet(e) {
  if (e.parameter && e.parameter.action === "creneaux") {
    return obtenirCreneaux(e);
  }
  return traiterDemande(e);
}

function doPost(e) {
  return traiterDemande(e);
}

function traiterDemande(e) {
  var verrou = LockService.getScriptLock();

  try {
    verrou.waitLock(10000);
  } catch (erreur) {
    return reponse({ ok: false, raison: "occupe" });
  }

  try {
    // Le Web App est public : tout ce qui arrive est vérifié ici, côté
    // serveur, car les contrôles du formulaire peuvent être contournés.
    var p = validerDemande(e.parameter);
    if (!p) {
      return reponse({ ok: false, raison: "invalide" });
    }
    // Limites vérifiées après la validation : des requêtes bidon ne peuvent
    // plus épuiser le quota et bloquer les vraies clientes.
    if (tropDeDemandes(p)) {
      return reponse({ ok: false, raison: "limite" });
    }

    var duree = p.duree_min;
    var debut = new Date(p.date + "T" + p.heure + ":00");
    var fin = new Date(debut.getTime() + duree * 60000);

    var agenda = CalendarApp.getCalendarById(CALENDAR_ID);

    var conflits = agenda.getEvents(debut, fin);
    if (conflits.length > 0) {
      return reponse({ ok: false, raison: "conflit" });
    }

    var titre = "RDV — " + p.prestation + " — " + p.nom;
    var description = [
      "Prestation : " + p.prestation,
      "Client : " + p.nom,
      "Téléphone : " + p.telephone,
      "Email : " + p.email,
      "Message : " + (p.message || "—"),
      "",
      "Demande reçue via le site Fnails.chtrx."
    ].join("\n");

    agenda.createEvent(titre, debut, fin, { description: description });
    compterCreation();

    envoyerEmailConfirmation(p);
    envoyerEmailPatron(p);

    return reponse({ ok: true });
  } finally {
    verrou.releaseLock();
  }
}

// ===== Sécurité =====

var LIMITES = {
  longueurs: { prestation: 150, nom: 80, telephone: 20, email: 120, message: 1000 },
  joursMaxAVenir: 180,
  demandesParEmailParHeure: 3,
  demandesParTelephoneParHeure: 3,
  demandesTotalesPar10Min: 20,
  // Nombre maximum de RDV créés depuis le site : empêche quelqu'un de
  // remplir tout l'agenda avec de fausses réservations.
  creationsParHeure: 6,
  creationsParJour: 25,
  // Consultations des créneaux (lecture de l'agenda) : protège les quotas Google.
  consultationsPar10Min: 300
};

// Jours de fermeture (0 = dimanche, 1 = lundi, ..., 6 = samedi).
// Ces jours ne sont ni proposés ni acceptés. Exemple : [0] ferme le dimanche.
var JOURS_FERMES = [];

// ===== Horaires =====

function versMinutes(hhmm) {
  var morceaux = String(hhmm).split(":");
  return parseInt(morceaux[0], 10) * 60 + parseInt(morceaux[1], 10);
}

function depuisMinutes(total) {
  var h = Math.floor(total / 60);
  var m = total % 60;
  return ("0" + h).slice(-2) + ":" + ("0" + m).slice(-2);
}

// Vrai si le créneau [début, début+durée] tient dans les horaires d'ouverture,
// sans déborder sur la pause déjeuner ni après la fermeture du soir.
function creneauDansHoraires(heureDebut, dureeMin) {
  var debut = versMinutes(heureDebut);
  var fin = debut + dureeMin;
  var matinDebut = versMinutes(HORAIRES.matinDebut);
  var matinFin = versMinutes(HORAIRES.matinFin);
  var apremDebut = versMinutes(HORAIRES.apremDebut);
  var apremFin = versMinutes(HORAIRES.apremFin);

  var dansLeMatin = debut >= matinDebut && fin <= matinFin;
  var dansLApresMidi = debut >= apremDebut && fin <= apremFin;
  return dansLeMatin || dansLApresMidi;
}

// Liste des heures de début possibles pour une durée de prestation donnée,
// un jour générique (sans tenir compte de l'agenda ni de l'heure actuelle).
function genererCreneauxJour(dureeMin) {
  var resultat = [];
  [
    [HORAIRES.matinDebut, HORAIRES.matinFin],
    [HORAIRES.apremDebut, HORAIRES.apremFin]
  ].forEach(function (periode) {
    var curseur = versMinutes(periode[0]);
    var limite = versMinutes(periode[1]);
    while (curseur + dureeMin <= limite) {
      resultat.push(depuisMinutes(curseur));
      curseur += HORAIRES.pasCreneauxMin;
    }
  });
  return resultat;
}

// Retire les caractères de contrôle et, pour les champs sur une ligne,
// les retours à la ligne (évite de fausser le texte de l'agenda/de l'email).
function nettoyer(valeur, longueurMax, surUneLigne) {
  var texte = String(valeur || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  if (surUneLigne) { texte = texte.replace(/[\r\n\t]+/g, " "); }
  texte = texte.trim();
  return texte.length > longueurMax ? null : texte;
}

// Renvoie une demande propre, ou null si quelque chose ne va pas.
function validerDemande(brut) {
  if (!brut) { return null; }

  // Champ piège du formulaire : invisible pour les humains, rempli par les robots.
  if (brut.site_web) { return null; }

  var L = LIMITES.longueurs;
  var p = {
    prestation: nettoyer(brut.prestation, L.prestation, true),
    nom: nettoyer(brut.nom, L.nom, true),
    telephone: nettoyer(brut.telephone, L.telephone, true),
    email: nettoyer(brut.email, L.email, true),
    message: nettoyer(brut.message, L.message, false),
    date: String(brut.date || ""),
    heure: String(brut.heure || ""),
    duree_min: parseInt(brut.duree_min, 10) || 60
  };

  if (!p.prestation || !p.nom || !p.telephone || !p.email || p.message === null) { return null; }
  if (p.nom.length < 2) { return null; }
  // Pas de lien dans le nom : il est repris dans l'email envoyé au client,
  // un lien y servirait à faire passer un message piégé pour le salon.
  var contientUnLien = /https?:|www\.|\.[a-z]{2,}\//i;
  if (contientUnLien.test(p.nom) || contientUnLien.test(p.prestation)) { return null; }
  if (!/^[0-9+ .()\-]{10,20}$/.test(p.telephone)) { return null; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email)) { return null; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) { return null; }
  if (!/^\d{2}:\d{2}$/.test(p.heure)) { return null; }
  if (p.duree_min < 15 || p.duree_min > 240) { return null; }
  if (!creneauDansHoraires(p.heure, p.duree_min)) { return null; }

  var debut = new Date(p.date + "T" + p.heure + ":00");
  if (isNaN(debut.getTime())) { return null; }
  var maintenant = new Date();
  if (debut < maintenant) { return null; }
  if (debut - maintenant > LIMITES.joursMaxAVenir * 24 * 3600 * 1000) { return null; }
  if (JOURS_FERMES.indexOf(debut.getDay()) !== -1) { return null; }

  return p;
}

// Incrémente un compteur temporaire et dit s'il dépasse la limite.
function depasse(cle, limite, dureeSecondes) {
  var cache = CacheService.getScriptCache();
  var valeur = parseInt(cache.get(cle) || "0", 10) + 1;
  cache.put(cle, String(valeur), dureeSecondes);
  return valeur > limite;
}

function cleSure(prefixe, texte) {
  return prefixe + ":" + Utilities.base64EncodeWebSafe(String(texte).toLowerCase().slice(0, 120));
}

// Limite le nombre de demandes (anti-spam) : au total, par email, par
// téléphone, et nombre de rendez-vous réellement créés par heure et par jour.
function tropDeDemandes(p) {
  var cache = CacheService.getScriptCache();
  if (parseInt(cache.get("creations:heure") || "0", 10) >= LIMITES.creationsParHeure) { return true; }
  if (parseInt(cache.get("creations:jour") || "0", 10) >= LIMITES.creationsParJour) { return true; }
  if (depasse("total", LIMITES.demandesTotalesPar10Min, 600)) { return true; }
  if (depasse(cleSure("email", p.email), LIMITES.demandesParEmailParHeure, 3600)) { return true; }
  var chiffres = p.telephone.replace(/\D/g, "").slice(-9);
  if (depasse(cleSure("tel", chiffres), LIMITES.demandesParTelephoneParHeure, 3600)) { return true; }
  return false;
}

function compterCreation() {
  var cache = CacheService.getScriptCache();
  cache.put("creations:heure", String(parseInt(cache.get("creations:heure") || "0", 10) + 1), 3600);
  cache.put("creations:jour", String(parseInt(cache.get("creations:jour") || "0", 10) + 1), 21600);
}

function envoyerEmailConfirmation(p) {
  if (!p.email) {
    return;
  }

  var morceauxDate = String(p.date).split("-");
  var dateAffichee = morceauxDate.length === 3
    ? morceauxDate[2] + "/" + morceauxDate[1] + "/" + morceauxDate[0]
    : p.date;

  var sujet = "Confirmation de votre rendez-vous — Fnails.chtrx";
  var corps = [
    "Bonjour " + p.nom + ",",
    "",
    "Votre rendez-vous est confirmé :",
    "",
    "Prestation : " + p.prestation,
    "Date : " + dateAffichee,
    "Heure : " + p.heure,
    "",
    "À bientôt !",
    "Fnails.chtrx"
  ].join("\n");

  try {
    MailApp.sendEmail(p.email, sujet, corps);
  } catch (erreur) {
    // L'email a échoué : le rendez-vous reste créé, on n'interrompt rien.
  }
}

// Prévient le salon par email à chaque nouvelle demande, en plus de
// l'événement déjà créé dans l'agenda.
function envoyerEmailPatron(p) {
  if (!EMAIL_PATRON) {
    return;
  }

  var morceauxDate = String(p.date).split("-");
  var dateAffichee = morceauxDate.length === 3
    ? morceauxDate[2] + "/" + morceauxDate[1] + "/" + morceauxDate[0]
    : p.date;

  var sujet = p.nom + " a pris RDV le " + dateAffichee + " à " + p.heure;
  var corps = [
    "Nouvelle demande de rendez-vous reçue via le site :",
    "",
    "Prestation : " + p.prestation,
    "Date : " + dateAffichee,
    "Heure : " + p.heure,
    "",
    "Cliente/client : " + p.nom,
    "Téléphone : " + p.telephone,
    "Email : " + p.email,
    "Message : " + (p.message || "—"),
    "",
    "L'événement a aussi été ajouté directement dans l'agenda."
  ].join("\n");

  try {
    MailApp.sendEmail(EMAIL_PATRON, sujet, corps);
  } catch (erreur) {
    // L'email a échoué : le rendez-vous reste créé, on n'interrompt rien.
  }
}

// Renvoie, pour un jour et une durée de prestation donnés, la liste des
// créneaux possibles avec leur disponibilité réelle (agenda consulté en
// lecture seule — rien n'est créé ni modifié ici).
function obtenirCreneaux(e) {
  var brut = e.parameter || {};
  var date = String(brut.date || "");
  var dureeMin = parseInt(brut.duree_min, 10) || 60;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return reponse({ ok: false, raison: "invalide" });
  }
  var jour = new Date(date + "T00:00:00");
  if (isNaN(jour.getTime())) {
    return reponse({ ok: false, raison: "invalide" });
  }
  if (dureeMin < 15 || dureeMin > 240) { dureeMin = 60; }
  if (depasse("consultations", LIMITES.consultationsPar10Min, 600)) {
    return reponse({ ok: false, raison: "limite" });
  }
  var debutAujourdhui = new Date();
  debutAujourdhui.setHours(0, 0, 0, 0);
  if (jour < debutAujourdhui || jour - debutAujourdhui > LIMITES.joursMaxAVenir * 24 * 3600 * 1000) {
    return reponse({ ok: false, raison: "invalide" });
  }
  if (JOURS_FERMES.indexOf(jour.getDay()) !== -1) {
    return reponse({ ok: true, ferme: true, creneaux: [] });
  }

  var candidats = genererCreneauxJour(dureeMin);

  // Retire les horaires déjà passés si le jour demandé est aujourd'hui.
  var maintenant = new Date();
  if (jour.toDateString() === maintenant.toDateString()) {
    var heureActuelle = depuisMinutes(maintenant.getHours() * 60 + maintenant.getMinutes());
    candidats = candidats.filter(function (h) { return h > heureActuelle; });
  }

  var agenda = CalendarApp.getCalendarById(CALENDAR_ID);
  var evenements = agenda.getEvents(new Date(date + "T00:00:00"), new Date(date + "T23:59:59"));

  var creneaux = candidats.map(function (heure) {
    var debut = new Date(date + "T" + heure + ":00");
    var fin = new Date(debut.getTime() + dureeMin * 60000);
    var libre = !evenements.some(function (ev) {
      return ev.getStartTime() < fin && ev.getEndTime() > debut;
    });
    return { heure: heure, libre: libre };
  });

  return reponse({ ok: true, creneaux: creneaux });
}

function reponse(objet) {
  return ContentService
    .createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}
