/* 把页面里的 MathML 逐条升级成 KaTeX 渲染；失败就保留原 MathML。 */
(function () {
  "use strict";
  if (!window.katex) return;

  var nodes = document.querySelectorAll("math");
  Array.prototype.forEach.call(nodes, function (m) {
    var ann = m.querySelector('annotation[encoding="application/x-tex"]');
    if (!ann) return;
    var tex = (ann.textContent || "").trim();
    if (!tex) return;
    var display = m.getAttribute("display") === "block";
    var host = document.createElement("span");
    host.className = "math-source";
    try {
      window.katex.render(tex, host, {
        displayMode: display,
        throwOnError: true,
        strict: false,
        trust: false
      });
      if (m.parentNode) m.parentNode.replaceChild(host, m);
    } catch (e) {
      /* 保留 MathML */
    }
  });
})();
