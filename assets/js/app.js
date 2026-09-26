(function () {
  "use strict";

  // ===== Configuration prise de rendez-vous =====
  // RDV_WEBAPP_URL : URL du Web App Google Apps Script (voir google-apps-script/Code.gs
  // et le README). Tant qu'elle est vide, le formulaire utilise le mode "mailto" de secours.
  var RDV_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbzOFW5jkfrrgX63J_KuEcI0iDrVW17y4of-pSECPOtoVJRPoNOnPOFDTBmexXcuhrpk/exec";
  // Adresse à laquelle les demandes sont envoyées en mode "mailto" de secours.
  var RDV_EMAIL = "fnails.chtrx@gmail.com";

  // ===== Menu plein écran (mobile) =====
  var boutonMenu = document.querySelector("[data-action='menu']");
  var menu = document.getElementById("menu");

  if (boutonMenu && menu) {
    var basculerMenu = function (ouvrir) {
      menu.classList.toggle("ouvert", ouvrir);
      document.body.classList.toggle("menu-ouvert", ouvrir);
      boutonMenu.setAttribute("aria-expanded", ouvrir ? "true" : "false");
      boutonMenu.setAttribute("aria-label", ouvrir ? "Fermer le menu" : "Ouvrir le menu");
    };

    boutonMenu.addEventListener("click", function () {
      basculerMenu(!menu.classList.contains("ouvert"));
    });

    menu.querySelectorAll("a").forEach(function (lien) {
      lien.addEventListener("click", function () { basculerMenu(false); });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("ouvert")) {
        basculerMenu(false);
        boutonMenu.focus();
      }
    });

    window.matchMedia("(min-width: 1081px)").addEventListener("change", function (mq) {
      if (mq.matches) { basculerMenu(false); }
    });
  }

  // ===== Apparitions au défilement =====
  var aReveler = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var observateur = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (entree) {
        if (entree.isIntersecting) {
          entree.target.classList.add("visible");
          observateur.unobserve(entree.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    aReveler.forEach(function (el) { observateur.observe(el); });
  } else {
    aReveler.forEach(function (el) { el.classList.add("visible"); });
  }

  document.querySelectorAll("[data-annee]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  var boutonTheme = document.querySelector("[data-action='theme']");
  if (boutonTheme) {
    var maj = function () {
      var sombre = document.documentElement.getAttribute("data-mode") === "dark";
      boutonTheme.setAttribute("aria-pressed", sombre ? "true" : "false");
      boutonTheme.setAttribute("aria-label", sombre ? "Activer le mode clair" : "Activer le mode sombre");
    };
    maj();
    boutonTheme.addEventListener("click", function () {
      var actuel = document.documentElement.getAttribute("data-mode") === "dark" ? "dark" : "light";
      var suivant = actuel === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-mode", suivant);
      try { localStorage.setItem("fnails-theme", suivant); } catch (e) {}
      maj();
    });
  }

  var formulaireRdv = document.getElementById("formulaire-rdv");
  if (formulaireRdv) {
    var champPrestation = document.getElementById("rdv-prestation");
    var champDuree = document.getElementById("rdv-duree");
    var resultat = document.getElementById("rdv-resultat");
    var resultatTexte = document.getElementById("rdv-resultat-texte");
    var zoneTexte = document.getElementById("rdv-texte");
    var boutonCopier = document.querySelector("[data-action='copier-rdv']");
    var boutonEnvoyer = formulaireRdv.querySelector("button[type='submit']");
    var libelleEnvoyer = boutonEnvoyer.querySelector(".btn__texte") || boutonEnvoyer;
    var champDate = document.getElementById("rdv-date");
    var champHeure = document.getElementById("rdv-heure");
    var etatCreneaux = document.querySelector("[data-creneaux-etat]");

    // ===== Jours proposés (aujourd'hui + 44 jours) =====
    var JOURS_PROPOSES = 45;
    var versISO = function (date) {
      var mois = ("0" + (date.getMonth() + 1)).slice(-2);
      var jour = ("0" + date.getDate()).slice(-2);
      return date.getFullYear() + "-" + mois + "-" + jour;
    };
    (function remplirJours() {
      var aujourdhui = new Date();
      for (var i = 0; i < JOURS_PROPOSES; i++) {
        var jour = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() + i);
        var option = document.createElement("option");
        option.value = versISO(jour);
        var libelle = jour.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
        option.textContent = (i === 0 ? "Aujourd'hui — " : i === 1 ? "Demain — " : "") + libelle.charAt(0).toUpperCase() + libelle.slice(1);
        champDate.appendChild(option);
      }
    })();

    // ===== Créneaux disponibles pour le jour choisi =====
    var jetonRequete = 0;
    var chargerCreneaux = function () {
      var date = champDate.value;
      if (!date) { return; }

      var jeton = ++jetonRequete;
      champHeure.disabled = true;
      champHeure.innerHTML = '<option value="" disabled selected>Chargement des horaires...</option>';
      etatCreneaux.textContent = "";

      var versMinutes = function (hhmm) {
        var p = hhmm.split(":");
        return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
      };
      var depuisMinutes = function (total) {
        return ("0" + Math.floor(total / 60)).slice(-2) + ":" + ("0" + (total % 60)).slice(-2);
      };
      // Mêmes horaires que le script (matin/après-midi, pas de 30 min) : sert
      // uniquement de repli si la vérification en direct n'a pas pu se faire.
      var remplirGenerique = function (note) {
        champHeure.innerHTML = '<option value="" disabled selected>Choisissez une heure</option>';
        var duree = parseInt(champDuree.value, 10) || 60;
        [["09:00", "13:00"], ["14:00", "19:00"]].forEach(function (periode) {
          var curseur = versMinutes(periode[0]);
          var limite = versMinutes(periode[1]);
          while (curseur + duree <= limite) {
            var h = depuisMinutes(curseur);
            var option = document.createElement("option");
            option.value = h;
            option.textContent = h;
            champHeure.appendChild(option);
            curseur += 30;
          }
        });
        champHeure.disabled = false;
        etatCreneaux.textContent = note || "";
      };

      if (!RDV_WEBAPP_URL) {
        remplirGenerique("");
        return;
      }

      var parametres = new URLSearchParams({ action: "creneaux", date: date, duree_min: champDuree.value || "60" });
      fetch(RDV_WEBAPP_URL + "?" + parametres.toString())
        .then(function (reponseHttp) { return reponseHttp.json(); })
        .then(function (json) {
          if (jeton !== jetonRequete) { return; }
          if (!json || !json.ok || !Array.isArray(json.creneaux)) {
            remplirGenerique("Disponibilité non vérifiée pour ce jour : le salon confirmera votre créneau.");
            return;
          }
          if (json.creneaux.length === 0) {
            champHeure.innerHTML = '<option value="" disabled selected>Aucun horaire disponible</option>';
            champHeure.disabled = true;
            etatCreneaux.textContent = "Aucun horaire disponible ce jour-là, choisissez un autre jour.";
            return;
          }
          champHeure.innerHTML = '<option value="" disabled selected>Choisissez une heure</option>';
          json.creneaux.forEach(function (creneau) {
            var option = document.createElement("option");
            option.value = creneau.heure;
            option.textContent = creneau.libre ? creneau.heure : creneau.heure + " — complet";
            option.disabled = !creneau.libre;
            champHeure.appendChild(option);
          });
          champHeure.disabled = false;
          etatCreneaux.textContent = "";
        })
        .catch(function () {
          if (jeton !== jetonRequete) { return; }
          remplirGenerique("Disponibilité non vérifiée pour ce jour : le salon confirmera votre créneau.");
        });
    };

    champDate.addEventListener("change", chargerCreneaux);

    // Validation en ligne : message sous le champ, pas d'alerte
    var champsRequis = formulaireRdv.querySelectorAll("[required]");
    var verifierChamp = function (champ) {
      // Un champ requis mais encore désactivé (ex. heures pas encore chargées)
      // ne doit pas être considéré valide juste parce qu'il est désactivé.
      var valide = champ.disabled ? !(champ.required && !champ.value) : champ.checkValidity();
      var bloc = champ.closest(".champ");
      var erreur = document.getElementById(champ.id + "-erreur");
      if (bloc) { bloc.classList.toggle("champ--erreur", !valide); }
      if (erreur) { erreur.hidden = valide; }
      champ.setAttribute("aria-invalid", valide ? "false" : "true");
      return valide;
    };
    champsRequis.forEach(function (champ) {
      champ.addEventListener("blur", function () { if (champ.value) { verifierChamp(champ); } });
      champ.addEventListener("input", function () {
        if (champ.getAttribute("aria-invalid") === "true") { verifierChamp(champ); }
      });
      champ.addEventListener("change", function () {
        if (champ.getAttribute("aria-invalid") === "true") { verifierChamp(champ); }
      });
    });

    champPrestation.addEventListener("change", function () {
      var option = champPrestation.options[champPrestation.selectedIndex];
      champDuree.value = (option && option.getAttribute("data-duree-min")) || "60";
      // La durée change les créneaux qui peuvent tenir avant la pause/fermeture.
      if (champDate.value) { chargerCreneaux(); }
    });

    // ===== Navigation par étapes (prestation → date/heure → coordonnées) =====
    var etapes = formulaireRdv.querySelectorAll(".etape");
    var indicateurItems = document.querySelectorAll("[data-etape-lien]");
    var etapeActuelle = 1;

    var formaterDateFr = function (iso) {
      var p = iso.split("-");
      return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : iso;
    };

    var creerLienModifier = function (cible) {
      var lien = document.createElement("button");
      lien.type = "button";
      lien.className = "etape__modifier";
      lien.textContent = "Modifier";
      lien.addEventListener("click", function () { afficherEtape(cible); });
      return lien;
    };

    var majRecaps = function () {
      var recap1 = formulaireRdv.querySelector('[data-recap="1"]');
      if (recap1) {
        recap1.innerHTML = "";
        var option = champPrestation.options[champPrestation.selectedIndex];
        var libelle = option && option.value ? option.textContent : "";
        recap1.appendChild(document.createTextNode("Prestation : " + libelle + " — "));
        recap1.appendChild(creerLienModifier(1));
      }
      var recap2 = formulaireRdv.querySelector('[data-recap="2"]');
      if (recap2) {
        var heure = document.getElementById("rdv-heure").value;
        if (champDate.value || heure) {
          recap2.innerHTML = "";
          var texteDate = champDate.value ? formaterDateFr(champDate.value) : "—";
          recap2.appendChild(document.createTextNode("Créneau : " + texteDate + (heure ? " à " + heure : "") + " — "));
          recap2.appendChild(creerLienModifier(2));
        } else {
          recap2.textContent = "";
        }
      }
    };

    var afficherEtape = function (n) {
      etapes.forEach(function (etape) {
        etape.hidden = Number(etape.getAttribute("data-etape")) !== n;
      });
      indicateurItems.forEach(function (item) {
        var num = Number(item.getAttribute("data-etape-lien"));
        item.classList.toggle("est-active", num === n);
        item.classList.toggle("est-complete", num < n);
      });
      etapeActuelle = n;
      majRecaps();
      formulaireRdv.closest(".formulaire").scrollIntoView({ behavior: "smooth", block: "start" });
    };

    var verifierEtape = function (n) {
      var champs = formulaireRdv.querySelector('.etape[data-etape="' + n + '"]').querySelectorAll("[required]");
      var valide = true;
      var premierInvalide = null;
      champs.forEach(function (champ) {
        if (!verifierChamp(champ) && !premierInvalide) { premierInvalide = champ; valide = false; }
      });
      if (premierInvalide) { premierInvalide.focus(); }
      return valide;
    };

    formulaireRdv.querySelectorAll('[data-action="etape-suivante"]').forEach(function (bouton) {
      bouton.addEventListener("click", function () {
        if (verifierEtape(etapeActuelle)) { afficherEtape(etapeActuelle + 1); }
      });
    });
    formulaireRdv.querySelectorAll('[data-action="etape-precedente"]').forEach(function (bouton) {
      bouton.addEventListener("click", function () { afficherEtape(etapeActuelle - 1); });
    });

    var construireTexte = function (d) {
      return (
        "Nouvelle demande de rendez-vous — Fnails.chtrx\n\n" +
        "Prestation : " + d.prestation + "\n" +
        "Date souhaitée : " + d.date + "\n" +
        "Heure souhaitée : " + d.heure + "\n" +
        "Nom : " + d.nom + "\n" +
        "Téléphone : " + d.telephone + "\n" +
        "Email : " + d.email + "\n" +
        "Message : " + (d.message || "—")
      );
    };

    var afficherResultat = function (texte, succes) {
      resultat.hidden = false;
      resultat.classList.toggle("rdv-resultat--erreur", !succes);
      resultatTexte.textContent = texte;
    };

    formulaireRdv.addEventListener("submit", function (e) {
      e.preventDefault();

      var premierInvalide = null;
      champsRequis.forEach(function (champ) {
        if (!verifierChamp(champ) && !premierInvalide) { premierInvalide = champ; }
      });
      if (premierInvalide) {
        premierInvalide.focus();
        return;
      }

      // Champ piège rempli = robot : on fait comme si tout allait bien,
      // sans rien envoyer (le robot n'apprend pas qu'il a été repéré).
      var piege = document.getElementById("rdv-site");
      if (piege && piege.value) {
        afficherResultat("Votre demande a bien été prise en compte.", true);
        formulaireRdv.reset();
        afficherEtape(1);
        return;
      }

      var d = {
        prestation: champPrestation.value,
        date: document.getElementById("rdv-date").value,
        heure: document.getElementById("rdv-heure").value,
        duree_min: champDuree.value,
        nom: document.getElementById("rdv-nom").value,
        telephone: document.getElementById("rdv-telephone").value,
        email: document.getElementById("rdv-email").value,
        message: document.getElementById("rdv-message").value
      };

      if (RDV_WEBAPP_URL) {
        // Le formulaire est configuré : on envoie la demande au Web App
        // Google Apps Script et on attend sa réponse pour savoir si le
        // créneau était libre avant d'afficher une confirmation.
        boutonEnvoyer.disabled = true;
        libelleEnvoyer.textContent = "Envoi en cours...";
        zoneTexte.hidden = true;
        boutonCopier.hidden = true;

        var donnees = new URLSearchParams(d);

        // Requête GET plutôt que POST : les Web Apps Google Apps Script
        // renvoient de façon fiable les en-têtes CORS nécessaires en GET,
        // ce qui n'est pas garanti en POST (le navigateur bloque alors la
        // lecture de la réponse malgré une demande correctement reçue).
        fetch(RDV_WEBAPP_URL + "?" + donnees.toString())
          .then(function (reponseHttp) { return reponseHttp.json(); })
          .then(function (resultatJson) {
            if (resultatJson && resultatJson.ok) {
              var dateChoisie = new Date(d.date + "T00:00:00");
              var dateAffichee = isNaN(dateChoisie.getTime())
                ? d.date
                : dateChoisie.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
              afficherResultat(
                "Votre rendez-vous est confirmé pour le " + dateAffichee + " à " + d.heure + ", merci et à bientôt !",
                true
              );
              formulaireRdv.reset();
              afficherEtape(1);
            } else if (resultatJson && resultatJson.raison === "conflit") {
              afficherResultat(
                "Ce créneau vient d'être réservé par quelqu'un d'autre. Merci de choisir une autre date ou un autre horaire.",
                false
              );
            } else if (resultatJson && resultatJson.raison === "limite") {
              afficherResultat(
                "Plusieurs demandes ont déjà été envoyées récemment. Merci de patienter un peu, ou de nous appeler au 06 58 81 11 98.",
                false
              );
            } else if (resultatJson && resultatJson.raison === "invalide") {
              afficherResultat(
                "Certaines informations n'ont pas été acceptées (date passée, horaire hors ouverture ou champ trop long). Merci de vérifier le formulaire.",
                false
              );
            } else {
              afficherResultat(
                "Votre demande n'a pas pu être envoyée. Merci de réessayer, ou de nous contacter directement via Instagram ou TikTok.",
                false
              );
            }
          })
          .catch(function () {
            afficherResultat(
              "Votre demande n'a pas pu être envoyée (problème de connexion). Merci de réessayer, ou de nous contacter directement via Instagram ou TikTok.",
              false
            );
          })
          .then(function () {
            boutonEnvoyer.disabled = false;
            libelleEnvoyer.textContent = "Envoyer la demande";
          });

        return;
      }

      // Mode de secours : pas encore configuré, on ouvre le client mail du visiteur.
      // Comme personne ne vérifie la disponibilité dans ce mode, la date/l'heure
      // restent à confirmer manuellement par le salon avant validation.
      var texte = construireTexte(d);
      var sujet = "Demande de RDV — " + d.prestation;
      var lienMailto =
        "mailto:" + encodeURIComponent(RDV_EMAIL) +
        "?subject=" + encodeURIComponent(sujet) +
        "&body=" + encodeURIComponent(texte);

      resultat.hidden = false;
      resultat.classList.remove("rdv-resultat--erreur");
      resultatTexte.innerHTML = "";
      resultatTexte.appendChild(document.createTextNode(
        "Votre logiciel de messagerie va s'ouvrir avec la demande pré-remplie (créneau à confirmer par le salon). " +
        "S'il ne s'ouvre pas, copiez le texte ci-dessous et envoyez-le manuellement à "
      ));
      var fort = document.createElement("strong");
      fort.textContent = RDV_EMAIL;
      resultatTexte.appendChild(fort);
      resultatTexte.appendChild(document.createTextNode("."));

      zoneTexte.hidden = false;
      zoneTexte.textContent = texte;
      boutonCopier.hidden = false;

      window.location.href = lienMailto;
    });

    if (boutonCopier) {
      boutonCopier.addEventListener("click", function () {
        var texte = zoneTexte.textContent;
        var apresCopie = function () {
          var original = boutonCopier.textContent;
          boutonCopier.textContent = "Copié";
          setTimeout(function () { boutonCopier.textContent = original; }, 2000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(texte).then(apresCopie, function () {
            selectionnerTexte(zoneTexte);
          });
        } else {
          selectionnerTexte(zoneTexte);
        }
      });
    }

    var selectionnerTexte = function (el) {
      var plage = document.createRange();
      plage.selectNodeContents(el);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(plage);
    };
  }

  var diaporama = document.querySelector("[data-diaporama]");
  if (diaporama) {
    var diapoCadre = diaporama.querySelector(".diaporama__cadre");
    var diapoPiste = diaporama.querySelector("[data-piste-diapo]");
    var diapoTousLesSlides = diapoPiste.children; // 2 clones (début/fin) + les photos réelles
    var diapoTotalReel = diapoTousLesSlides.length - 2;
    var diapoPoints = diaporama.querySelectorAll("[data-points] button");
    var diapoIndex = 1; // 0 = clone de fin, 1..N = photos réelles, N+1 = clone de début
    var diapoMinuteur = null;
    var diapoReduireMouvement = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var diapoPositionner = function () {
      diapoPiste.style.transform = "translateX(" + (-diapoIndex * 100) + "%)";
    };

    var diapoMajPoints = function () {
      var reel = (diapoIndex - 1 + diapoTotalReel) % diapoTotalReel;
      diapoPoints.forEach(function (point, n) {
        var actif = n === reel;
        point.classList.toggle("active", actif);
        point.setAttribute("aria-current", actif ? "true" : "false");
      });
    };

    var diapoSansTransition = function (fn) {
      diapoPiste.classList.add("sans-transition");
      fn();
      void diapoPiste.offsetHeight;
      diapoPiste.classList.remove("sans-transition");
    };

    var diapoAllerA = function (i) {
      // Clics très rapides : ne jamais dépasser les clones de début/fin
      if (i < 0 || i > diapoTotalReel + 1) { return; }
      diapoIndex = i;
      diapoPositionner();
      diapoMajPoints();
    };

    var diapoSuivant = function () { diapoAllerA(diapoIndex + 1); };
    var diapoPrecedent = function () { diapoAllerA(diapoIndex - 1); };

    // Boucle infinie : au passage sur un clone, on saute sans transition
    // vers la vraie photo équivalente, une fois l'animation terminée.
    diapoPiste.addEventListener("transitionend", function (e) {
      if (e.propertyName && e.propertyName !== "transform") { return; }
      if (diapoIndex === diapoTotalReel + 1) {
        diapoSansTransition(function () { diapoIndex = 1; diapoPositionner(); });
      } else if (diapoIndex === 0) {
        diapoSansTransition(function () { diapoIndex = diapoTotalReel; diapoPositionner(); });
      }
    });

    var diapoDemarrer = function () {
      if (diapoReduireMouvement || diapoMinuteur) { return; }
      diapoMinuteur = setInterval(diapoSuivant, 4200);
    };
    var diapoArreter = function () {
      clearInterval(diapoMinuteur);
      diapoMinuteur = null;
    };
    var diapoRelancer = function () { diapoArreter(); diapoDemarrer(); };

    var diapoPrec = diaporama.querySelector("[data-action='diapo-prec']");
    var diapoSuiv = diaporama.querySelector("[data-action='diapo-suiv']");
    if (diapoPrec) { diapoPrec.addEventListener("click", function () { diapoPrecedent(); diapoRelancer(); }); }
    if (diapoSuiv) { diapoSuiv.addEventListener("click", function () { diapoSuivant(); diapoRelancer(); }); }

    diapoPoints.forEach(function (point, n) {
      point.addEventListener("click", function () { diapoAllerA(n + 1); diapoRelancer(); });
    });

    diaporama.addEventListener("mouseenter", diapoArreter);
    diaporama.addEventListener("mouseleave", diapoDemarrer);
    diaporama.addEventListener("focusin", diapoArreter);
    diaporama.addEventListener("focusout", diapoDemarrer);

    // Glisser au doigt ou à la souris (Pointer Events couvre les deux) :
    // le rail suit le geste en direct, puis s'anime jusqu'à la photo
    // suivante/précédente ou revient à sa place si le geste est trop court.
    var diapoPointeurActif = null;
    var diapoDepartX = 0;
    var diapoDeltaActuel = 0;
    var diapoLargeur = 1;

    var diapoSurPointerDown = function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) { return; }
      // Les flèches sont dans le cadre : sans ce test, la capture du pointeur
      // détournerait leur clic vers le cadre et elles ne répondraient plus.
      if (e.target.closest("button")) { return; }
      diapoPointeurActif = e.pointerId;
      diapoDepartX = e.clientX;
      diapoDeltaActuel = 0;
      diapoLargeur = diapoCadre.clientWidth || 1;
      diapoPiste.classList.add("sans-transition");
      diapoArreter();
      if (diapoCadre.setPointerCapture) {
        try { diapoCadre.setPointerCapture(diapoPointeurActif); } catch (erreur) {}
      }
    };
    var diapoSurPointerMove = function (e) {
      if (diapoPointeurActif === null || e.pointerId !== diapoPointeurActif) { return; }
      diapoDeltaActuel = e.clientX - diapoDepartX;
      var pourcent = (diapoDeltaActuel / diapoLargeur) * 100;
      diapoPiste.style.transform = "translateX(" + (-diapoIndex * 100 + pourcent) + "%)";
    };
    var diapoSurPointerFin = function (e) {
      if (diapoPointeurActif === null || e.pointerId !== diapoPointeurActif) { return; }
      diapoPiste.classList.remove("sans-transition");
      var seuil = diapoLargeur * 0.16;
      if (diapoDeltaActuel < -seuil) { diapoSuivant(); }
      else if (diapoDeltaActuel > seuil) { diapoPrecedent(); }
      else { diapoPositionner(); }
      diapoPointeurActif = null;
      diapoDeltaActuel = 0;
      diapoDemarrer();
    };

    diapoCadre.addEventListener("pointerdown", diapoSurPointerDown);
    diapoCadre.addEventListener("pointermove", diapoSurPointerMove);
    diapoCadre.addEventListener("pointerup", diapoSurPointerFin);
    diapoCadre.addEventListener("pointercancel", diapoSurPointerFin);

    diapoSansTransition(function () { diapoPositionner(); diapoMajPoints(); });
    diapoDemarrer();
  }
})();
