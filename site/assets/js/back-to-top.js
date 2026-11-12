(function () {
  "use strict";
  var button = document.querySelector(".back-to-top");
  if (!button) return;
  var scheduled = false;
  function update() {
    button.hidden = window.scrollY < 400;
    document.body.classList.toggle("back-to-top-active", !button.hidden);
    scheduled = false;
  }
  window.addEventListener("scroll", function () {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  }, { passive: true });
  window.addEventListener("pageshow", update);
  button.addEventListener("click", function (event) {
    var keyboard = event.detail === 0;
    if (keyboard) {
      var heading = document.querySelector("h1");
      if (heading) {
        var oldTabindex = heading.getAttribute("tabindex");
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
        heading.addEventListener("blur", function () {
          if (oldTabindex === null) heading.removeAttribute("tabindex");
          else heading.setAttribute("tabindex", oldTabindex);
        }, { once: true });
      }
    }
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduced ? "instant" : "smooth" });
  });
  update();
})();
