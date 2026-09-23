(function () {
  "use strict";

  // ===== Configuration prise de rendez-vous =====
  // RDV_WEBAPP_URL : URL du Web App Google Apps Script (voir google-apps-script/Code.gs
  // et le README). Tant qu'elle est vide, le formulaire utilise le mode "mailto" de secours.
  var RDV_WEBAPP_URL = "";
  // Adresse à laquelle les demandes sont envoyées en mode "mailto" de secours.
  var RDV_EMAIL = "email-a-completer@fnails-chtrx.fr";

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
      var sombre = document.documentElement.getAttribute("data-theme") === "dark";
      boutonTheme.setAttribute("aria-pressed", sombre ? "true" : "false");
      boutonTheme.setAttribute("aria-label", sombre ? "Activer le mode clair" : "Activer le mode sombre");
    };
    maj();
    boutonTheme.addEventListener("click", function () {
      var actuel = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      var suivant = actuel === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", suivant);
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

    formulaireRdv.addEventListener("submit", function (e) {
      var d = {
        prestation: champPrestation.value,
        date: document.getElementById("rdv-date").value,
        heure: document.getElementById("rdv-heure").value,
        nom: document.getElementById("rdv-nom").value,
        telephone: document.getElementById("rdv-telephone").value,
        email: document.getElementById("rdv-email").value,
        message: document.getElementById("rdv-message").value
      };

      resultat.hidden = false;

      if (RDV_WEBAPP_URL) {
        // Le formulaire est configuré : la soumission POST native (via l'iframe
        // caché ci-dessous) part directement vers le Web App Google Apps Script,
        // qui crée l'événement dans l'agenda. On laisse la navigation se faire.
        formulaireRdv.action = RDV_WEBAPP_URL;
        resultatTexte.textContent = "Votre demande a été envoyée : elle apparaîtra directement dans l'agenda du salon.";
        zoneTexte.hidden = true;
        boutonCopier.hidden = true;
        return;
      }

      // Mode de secours : pas encore configuré, on ouvre le client mail du visiteur.
      e.preventDefault();
      var texte = construireTexte(d);
      var sujet = "Demande de RDV — " + d.prestation;
      var lienMailto =
        "mailto:" + encodeURIComponent(RDV_EMAIL) +
        "?subject=" + encodeURIComponent(sujet) +
        "&body=" + encodeURIComponent(texte);

      resultatTexte.innerHTML = "";
      resultatTexte.appendChild(document.createTextNode(
        "Votre logiciel de messagerie va s'ouvrir avec la demande pré-remplie. " +
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
})();
