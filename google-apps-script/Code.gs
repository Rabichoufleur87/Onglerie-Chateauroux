/**
 * Fnails.chtrx — réception des demandes de rendez-vous du site,
 * création automatique de l'événement dans Google Calendar, et
 * email de confirmation envoyé au client.
 *
 * Installation (voir aussi README.md à la racine du dépôt) :
 * 1. Aller sur https://script.google.com et créer un nouveau projet,
 *    avec le compte Google dont l'agenda doit recevoir les rendez-vous.
 * 2. Remplacer tout le contenu de Code.gs par ce fichier.
 * 3. Menu Déployer > Nouveau déploiement.
 *    - Type : Application Web.
 *    - Exécuter en tant que : Moi.
 *    - Qui a accès : Tout le monde.
 * 4. Autoriser l'accès demandé (c'est votre propre compte Google).
 * 5. Copier l'URL du Web App affichée après le déploiement.
 * 6. Coller cette URL dans assets/js/app.js, dans la constante
 *    RDV_WEBAPP_URL en haut du fichier.
 *
 * L'email de confirmation est envoyé gratuitement via Gmail (MailApp),
 * sans aucun compte ni service tiers — juste le compte Google déjà
 * utilisé pour le script.
 *
 * Chaque nouvelle demande de rendez-vous vérifie d'abord qu'aucun
 * événement n'existe déjà sur le créneau demandé, puis crée l'événement
 * (prestation, nom, téléphone, email du client) dans l'agenda. Un verrou
 * évite que deux demandes envoyées au même moment ne passent toutes les
 * deux la vérification.
 */

var CALENDAR_ID = "primary"; // "primary" = l'agenda principal de ce compte Google

function doGet(e) {
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
    var p = e.parameter;

    var duree = parseInt(p.duree_min, 10) || 60;
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

    envoyerEmailConfirmation(p);

    return reponse({ ok: true });
  } finally {
    verrou.releaseLock();
  }
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

function reponse(objet) {
  return ContentService
    .createTextOutput(JSON.stringify(objet))
    .setMimeType(ContentService.MimeType.JSON);
}
