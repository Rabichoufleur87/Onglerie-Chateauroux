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
})();
