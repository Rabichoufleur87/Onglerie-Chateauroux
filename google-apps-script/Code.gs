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
    // Le Web App est public : tout ce qui arrive est vérifié ici, côté
    // serveur, car les contrôles du formulaire peuvent être contournés.
    if (tropDeDemandes(e.parameter)) {
      return reponse({ ok: false, raison: "limite" });
    }
    var p = validerDemande(e.parameter);
    if (!p) {
      return reponse({ ok: false, raison: "invalide" });
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

    envoyerEmailConfirmation(p);

    return reponse({ ok: true });
  } finally {
    verrou.releaseLock();
  }
}

// ===== Sécurité =====

var LIMITES = {
  longueurs: { prestation: 150, nom: 80, telephone: 20, email: 120, message: 1000 },
  joursMaxAVenir: 180,
  heureOuverture: "09:00",
  heureFermeture: "19:00",
  demandesParEmailParHeure: 3,
  demandesTotalesPar10Min: 20
};

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
  if (/https?:|www\.|\.[a-z]{2,}\//i.test(p.nom)) { return null; }
  if (!/^[0-9+ .()\-]{10,20}$/.test(p.telephone)) { return null; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email)) { return null; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) { return null; }
  if (!/^\d{2}:\d{2}$/.test(p.heure)) { return null; }
  if (p.heure < LIMITES.heureOuverture || p.heure > LIMITES.heureFermeture) { return null; }
  if (p.duree_min < 15 || p.duree_min > 240) { return null; }

  var debut = new Date(p.date + "T" + p.heure + ":00");
  if (isNaN(debut.getTime())) { return null; }
  var maintenant = new Date();
  if (debut < maintenant) { return null; }
  if (debut - maintenant > LIMITES.joursMaxAVenir * 24 * 3600 * 1000) { return null; }

  return p;
}

// Limite le nombre de demandes (anti-spam) : par adresse email et au total.
function tropDeDemandes(brut) {
  var cache = CacheService.getScriptCache();
  var email = String((brut && brut.email) || "").toLowerCase().slice(0, 120);

  var total = parseInt(cache.get("total") || "0", 10) + 1;
  cache.put("total", String(total), 600);
  if (total > LIMITES.demandesTotalesPar10Min) { return true; }

  if (email) {
    var cle = "email:" + Utilities.base64EncodeWebSafe(email);
    var parEmail = parseInt(cache.get(cle) || "0", 10) + 1;
    cache.put(cle, String(parEmail), 3600);
    if (parEmail > LIMITES.demandesParEmailParHeure) { return true; }
  }
  return false;
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
