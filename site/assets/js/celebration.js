/* One animation clock for bursts, flashes and content shake. */
(function () {
  "use strict";
  var button = document.getElementById("egg");
  var canvas = document.getElementById("fx");
  var flash = document.getElementById("fx-flash");
  if (!button || !canvas || !flash) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var palette = [
    ["#e0245e", "#ff8fb1"], ["#f4b400", "#ffe98a"],
    ["#1b6ca8", "#8ec9f0"], ["#7b2ff7", "#cfaeff"],
    ["#0f9d58", "#9be7bd"], ["#ff6d00", "#ffc48a"]
  ];
  var schedule = [0, 170, 330, 500];
  var drag = -Math.log(0.985) * 60;
  var terminalVelocity = 180 / drag;
  var particles = [], rings = [], impacts = [], targets = [];
  var frameId = 0, origin = null, nextBurst = 0;
  var small = false, reduced = false, targetsRestored = true;
  var originalTransition = flash.style.transition;

  function matches(query) {
    return window.matchMedia ? window.matchMedia(query).matches : false;
  }
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function restoreTargets() {
    if (targetsRestored) return;
    targets.forEach(function (target) {
      target.element.style.transform = target.transform;
      target.element.style.willChange = target.willChange;
    });
    targetsRestored = true;
  }
  function stop() {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    restoreTargets();
    particles = []; rings = []; impacts = [];
    flash.style.opacity = "0";
    flash.style.transition = originalTransition;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
  function burst(index, now) {
    var k = small ? 0.55 : 1;
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight * (small ? 0.34 : 0.4);
    var positions = [[cx, cy], [cx - 170 * k, cy + 60 * k],
      [cx + 180 * k, cy - 40 * k], [cx, cy + 150 * k]];
    var count = Math.round([320, 200, 200, 160][index] * k);
    var power = (small ? [11, 8, 8, 7] : [15, 11, 11, 9])[index];
    var point = positions[index];
    var colors = palette[Math.floor(Math.random() * palette.length)];
    for (var i = 0; i < count; i++) {
      var angle = Math.PI * 2 * i / count + Math.random() * 0.14;
      var speed = power * (0.3 + Math.random()) * 60;
      particles.push({x: point[0], y: point[1], born: now,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        duration: 1000 / ((0.004 + Math.random() * 0.005) * 60),
        color: colors[Math.random() < 0.75 ? 0 : 1],
        radius: (small ? 1.8 : 2.2) + Math.random() * (small ? 2.2 : 3.2)});
    }
    rings.push({x: point[0], y: point[1], born: now, radius: 8, color: colors[0]});
    if (!small) rings.push({x: point[0], y: point[1], born: now, radius: 2, color: colors[1]});
    impacts.push({born: now, strength: (small ? 3 : 7) * (index === 0 ? 1 : 0.8)});
  }
  function position(particle, age) {
    var t = Math.max(age, 0) / 1000;
    var distance = (1 - Math.exp(-drag * t)) / drag;
    return {x: particle.x + particle.vx * distance,
      y: particle.y + (particle.vy - terminalVelocity) * distance + terminalVelocity * t};
  }
  function paintParticles(now) {
    var alive = [];
    particles.forEach(function (particle) {
      var age = now - particle.born;
      var alpha = 1 - age / particle.duration;
      if (alpha <= 0) return;
      alive.push(particle);
      var current = position(particle, age);
      var previous = position(particle, age - 1000 / 60);
      ctx.strokeStyle = particle.color;
      if (!small) {
        ctx.globalAlpha = alpha * 0.18;
        ctx.lineWidth = particle.radius * 4.5;
        ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(current.x, current.y); ctx.stroke();
      }
      ctx.globalAlpha = alpha;
      ctx.lineWidth = particle.radius * (small ? 1.1 : 0.5 + 0.5 * alpha);
      ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(current.x, current.y); ctx.stroke();
    });
    particles = alive;
    rings = rings.filter(function (ring) {
      var age = now - ring.born;
      var alpha = 1 - age / (1000 / (0.045 * 60));
      if (alpha <= 0) return false;
      ctx.globalAlpha = alpha * 0.55; ctx.strokeStyle = ring.color; ctx.lineWidth = 4 * alpha + 1;
      ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.radius + age * (small ? 12 : 16) * 60 / 1000, 0, Math.PI * 2); ctx.stroke();
      return true;
    });
    ctx.globalAlpha = 1;
  }
  function paintImpact(now) {
    var dx = 0, dy = 0, brightness = 0;
    impacts = impacts.filter(function (impact) {
      var age = now - impact.born;
      if (age >= 140) return false;
      var strength = impact.strength * Math.pow(1 - age / 140, 2);
      dx += Math.cos(age * 0.13) * strength;
      dy += Math.sin(age * 0.17 + 0.8) * strength * 0.65;
      brightness = Math.max(brightness, 0.85 * Math.max(0, 1 - age / 90));
      return true;
    });
    flash.style.opacity = reduced ? "0" : String(brightness);
    if (!reduced && !targetsRestored) {
      var limit = small ? 3 : 7;
      dx = Math.max(-limit, Math.min(limit, dx));
      dy = Math.max(-limit, Math.min(limit, dy));
      targets.forEach(function (target) {
        var base = target.transform && target.transform !== "none" ? target.transform + " " : "";
        target.element.style.transform = base + "translate3d(" + dx + "px," + dy + "px,0)";
      });
    }
    if (nextBurst === schedule.length && impacts.length === 0) restoreTargets();
  }
  function frame(now) {
    frameId = 0;
    if (origin === null) origin = now;
    while (nextBurst < schedule.length && now - origin >= schedule[nextBurst]) {
      burst(nextBurst++, now);
    }
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.lineCap = "round";
    paintImpact(now);
    paintParticles(now);
    if (nextBurst < schedule.length || particles.length || rings.length || impacts.length) {
      frameId = window.requestAnimationFrame(frame);
    } else stop();
  }
  function show() {
    stop();
    small = matches("(max-width: 760px)") || ("ontouchstart" in window && window.innerWidth < 900);
    reduced = matches("(prefers-reduced-motion: reduce)");
    var elements = document.querySelectorAll("main.article, .wrap > .hero, .wrap > #note");
    targets = Array.prototype.map.call(elements, function (element) {
      return {element: element, transform: element.style.transform || "", willChange: element.style.willChange || ""};
    });
    targetsRestored = reduced;
    if (!reduced) targets.forEach(function (target) { target.element.style.willChange = "transform"; });
    flash.style.transition = "none";
    origin = null; nextBurst = 0;
    frameId = window.requestAnimationFrame(frame);
  }
  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); });
  button.style.touchAction = "manipulation";
  button.addEventListener("click", function (event) { event.preventDefault(); show(); });
  var keys = "";
  window.addEventListener("keydown", function (event) {
    if (event.repeat) return;
    keys = (keys + event.key.toLowerCase()).slice(-3);
    if (keys === "www") show();
  });
})();
