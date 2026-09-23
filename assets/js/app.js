(function () {
  "use strict";

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
})();
