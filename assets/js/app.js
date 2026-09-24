(function () {
  "use strict";

  // ===== Configuration prise de rendez-vous =====
  // RDV_WEBAPP_URL : URL du Web App Google Apps Script (voir google-apps-script/Code.gs
  // et le README). Tant qu'elle est vide, le formulaire utilise le mode "mailto" de secours.
  var RDV_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwY2eQIhn1gAZwwQCW5o62j5DjcU-3I_dNFf4MFQC-LfQlc2nHAfsX2U8YZ9WuE7d3k/exec";
  // Adresse à laquelle les demandes sont envoyées en mode "mailto" de secours.
  var RDV_EMAIL = "fnails.chtrx@gmail.com";

  var boutonMenu = document.querySelector("[data-action='menu']");
  var nav = document.getElementById("navigation");

  if (boutonMenu && nav) {
    boutonMenu.addEventListener("click", function () {
      var ouvert = nav.classList.toggle("ouvert");
      boutonMenu.setAttribute("aria-expanded", ouvert ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (lien) {
      lien.addEventListener("click", function () {
        nav.classList.remove("ouvert");
        boutonMenu.setAttribute("aria-expanded", "false");
      });
    });
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

    champPrestation.addEventListener("change", function () {
      var option = champPrestation.options[champPrestation.selectedIndex];
      champDuree.value = (option && option.getAttribute("data-duree-min")) || "60";
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
        boutonEnvoyer.textContent = "Envoi en cours...";
        zoneTexte.hidden = true;
        boutonCopier.hidden = true;

        var donnees = new URLSearchParams(d);

        fetch(RDV_WEBAPP_URL, { method: "POST", body: donnees })
          .then(function (reponseHttp) { return reponseHttp.json(); })
          .then(function (resultatJson) {
            if (resultatJson && resultatJson.ok) {
              afficherResultat(
                "Votre demande a été envoyée : elle apparaît directement dans l'agenda du salon. Vous recevrez une confirmation.",
                true
              );
              formulaireRdv.reset();
            } else if (resultatJson && resultatJson.raison === "conflit") {
              afficherResultat(
                "Ce créneau vient d'être réservé par quelqu'un d'autre. Merci de choisir une autre date ou un autre horaire.",
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
            boutonEnvoyer.textContent = "Envoyer la demande";
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
          boutonCopier.textContent = "Copié !";
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

  var piste = document.querySelector("[data-piste]");
  if (piste) {
    var pasDefilement = function () {
      var premiere = piste.querySelector(".carte");
      if (!premiere) { return 280; }
      var style = window.getComputedStyle(piste);
      return premiere.getBoundingClientRect().width + parseFloat(style.columnGap || style.gap || 24);
    };

    var defiler = function (sens) {
      var max = piste.scrollWidth - piste.clientWidth;
      var cible = piste.scrollLeft + sens * pasDefilement();
      if (cible >= max - 4) {
        cible = 0;
      } else if (cible < 0) {
        cible = max;
      }
      piste.scrollTo({ left: cible, behavior: "smooth" });
    };

    var minuteur = null;
    var reduireMouvement = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var demarrerAuto = function () {
      if (reduireMouvement || minuteur) { return; }
      minuteur = setInterval(function () { defiler(1); }, 3500);
    };
    var arreterAuto = function () {
      clearInterval(minuteur);
      minuteur = null;
    };
    var relancerAuto = function () { arreterAuto(); demarrerAuto(); };

    var precedent = document.querySelector("[data-action='carrousel-prec']");
    var suivant = document.querySelector("[data-action='carrousel-suiv']");
    if (precedent) { precedent.addEventListener("click", function () { defiler(-1); relancerAuto(); }); }
    if (suivant) { suivant.addEventListener("click", function () { defiler(1); relancerAuto(); }); }

    piste.addEventListener("mouseenter", arreterAuto);
    piste.addEventListener("mouseleave", demarrerAuto);
    piste.addEventListener("touchstart", arreterAuto, { passive: true });
    piste.addEventListener("focusin", arreterAuto);
    piste.addEventListener("focusout", demarrerAuto);

    demarrerAuto();
  }
})();
