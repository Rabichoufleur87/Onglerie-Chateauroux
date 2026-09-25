// Appliqué dans <head>, avant l'affichage, pour éviter un flash de couleur.
// Fichier séparé (et non script en ligne) pour respecter la politique de
// sécurité du contenu (CSP) déclarée dans chaque page.
(function () {
  document.documentElement.classList.add("js");
  try {
    var saved = localStorage.getItem("fnails-theme");
    var theme = saved || "light"; // clair par défaut, sombre seulement si choisi
    document.documentElement.setAttribute("data-mode", theme);
  } catch (e) {}
})();
