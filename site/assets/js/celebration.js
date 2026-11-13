/* Original published artwork and click layering, driven by one frame clock. */
(function () {
  "use strict";
  var button = document.getElementById("egg");
  var canvas = document.getElementById("fx");
  var flash = document.getElementById("fx-flash");
  if (!button || !canvas || !flash) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;
  var palette = [["#e0245e", "#ff8fb1"], ["#f4b400", "#ffe98a"],
    ["#1b6ca8", "#8ec9f0"], ["#7b2ff7", "#cfaeff"],
    ["#0f9d58", "#9be7bd"], ["#ff6d00", "#ffc48a"]];
  var schedule = [0, 170, 330, 500], frameLength = 1000 / 60;
  var parts = [], rings = [], scenes = [], targets = [];
  var frameId = 0, reduced = false, restored = true;
  var originalTransition = flash.style.transition;

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function restoreTargets() {
    if (restored) return;
    targets.forEach(function (target) {
      target.element.style.transform = target.transform;
      target.element.style.willChange = target.willChange;
    });
    restored = true;
  }
  function prepareTargets() {
    if (reduced || !restored) return;
    targets = Array.prototype.map.call(document.querySelectorAll(
      ".topnav, main.article, .notetoc, .wrap > .hero, .wrap > #note, #fx, #fx-flash"
    ), function (element) {
      return {element:element, transform:element.style.transform || "", willChange:element.style.willChange || ""};
    });
    targets.forEach(function (target) { target.element.style.willChange = "transform"; });
    restored = false;
  }
  function stop() {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    parts = []; rings = []; scenes = [];
    restoreTargets();
    flash.style.opacity = "0";
    flash.style.transition = originalTransition;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
  function burst(index, now) {
    if (parts.length > 2200) return;
    var cx = window.innerWidth / 2, cy = window.innerHeight * 0.4;
    var positions = [[cx,cy],[cx-170,cy+60],[cx+180,cy-40],[cx,cy+150]];
    var point = positions[index], count = [320,200,200,160][index];
    var power = [15,11,11,9][index];
    var pair = palette[Math.floor(Math.random() * palette.length)];
    for (var i=0;i<count;i++) {
      var angle = Math.PI * 2 * i / count + Math.random() * 0.14;
      var speed = power * (0.3 + Math.random());
      parts.push({x:point[0],y:point[1],x0:point[0],y0:point[1],born:now,
        vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
        decay:0.004+Math.random()*0.005,color:pair[Math.random()<0.75?0:1],
        radius:2.2+Math.random()*3.2,spin:Math.random()*6.28});
    }
    rings.push({x:point[0],y:point[1],radius:8,born:now,color:pair[0]});
    rings.push({x:point[0],y:point[1],radius:2,born:now,color:pair[1]});
  }
  function easeOut(value) {
    if (value<=0) return 0;
    if (value>=1) return 1;
    var lo=0,hi=1,t=0;
    for(var i=0;i<18;i++) {
      t=(lo+hi)/2;
      var x=3*(1-t)*t*t*0.58+t*t*t;
      if(x<value) lo=t; else hi=t;
    }
    return 3*(1-t)*t*t+t*t*t;
  }
  function flashOpacity(age) {
    if(age<0 || age>=590) return 0;
    if(age<=90) return easeOut(age/500);
    return easeOut(90/500)*(1-easeOut((age-90)/500));
  }
  function paintCamera(now) {
    var latest=scenes.length?scenes[scenes.length-1]:null;
    var age=latest?now-latest.started:Infinity;
    var brightness=0;
    scenes.forEach(function(scene) {brightness=Math.max(brightness,flashOpacity(now-scene.started));});
    flash.style.opacity=reduced?"0":String(brightness);
    if(reduced || age>=340) {restoreTargets();return;}
    var points=[[0,0],[-7,5],[6,-4],[-3,2],[0,0]];
    var progress=easeOut(age/340)*4, index=Math.min(3,Math.floor(progress));
    var fraction=progress-index;
    var dx=points[index][0]+(points[index+1][0]-points[index][0])*fraction;
    var dy=points[index][1]+(points[index+1][1]-points[index][1])*fraction;
    targets.forEach(function(target) {
      var base=target.transform && target.transform!=="none"?target.transform+" ":"";
      target.element.style.transform=base+"translate3d("+dx+"px,"+dy+"px,0)";
    });
  }
  function paintParticles(now) {
    // Fractional extension of the original 60 Hz recurrence. At 60 Hz this is
    // the original trajectory, including its first outward step and gravity.
    for(var i=parts.length-1;i>=0;i--) {
      var p=parts[i], n=1+(now-p.born)/frameLength;
      var alpha=1-p.decay*n;
      if(alpha<=0) {parts.splice(i,1);continue;}
      var distance=(1-Math.pow(0.985,n))/(1-0.985);
      var px=p.x,py=p.y;
      p.x=p.x0+p.vx*distance;
      p.y=p.y0+p.vy*distance+0.05*0.985/(1-0.985)*(n-distance);
      ctx.globalAlpha=alpha*0.18;ctx.strokeStyle=p.color;ctx.lineWidth=p.radius*4.5;
      ctx.lineCap="round";ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(p.x,p.y);ctx.stroke();
      ctx.globalAlpha=alpha;ctx.lineWidth=p.radius*(0.5+0.5*alpha);
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(p.x,p.y);ctx.stroke();
    }
    for(var j=rings.length-1;j>=0;j--) {
      var ring=rings[j], ticks=1+(now-ring.born)/frameLength;
      var life=1-0.045*ticks;
      if(life<=0) {rings.splice(j,1);continue;}
      ctx.globalAlpha=life*0.55;ctx.strokeStyle=ring.color;ctx.lineWidth=4*life+1;
      ctx.beginPath();ctx.arc(ring.x,ring.y,ring.radius+16*ticks,0,Math.PI*2);ctx.stroke();
    }
    ctx.globalAlpha=1;
  }
  function frame(now) {
    frameId=0;
    scenes.forEach(function(scene) {
      if(scene.started===null) scene.started=now;
      while(scene.next<schedule.length && now-scene.started>=schedule[scene.next]) burst(scene.next++,now);
    });
    ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
    paintCamera(now);
    paintParticles(now);
    scenes=scenes.filter(function(scene) {return scene.next<schedule.length || now-scene.started<590;});
    if(parts.length || rings.length || scenes.length) frameId=window.requestAnimationFrame(frame);
    else stop();
  }
  function show() {
    reduced=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)").matches:false;
    prepareTargets();
    flash.style.transition="none";
    scenes.push({started:null,next:0});
    if(!frameId) frameId=window.requestAnimationFrame(frame);
  }
  resize();
  window.addEventListener("resize",resize);
  document.addEventListener("visibilitychange",function(){if(document.hidden)stop();});
  button.style.touchAction="manipulation";
  button.addEventListener("click",function(event){event.preventDefault();show();});
  var keys="";
  window.addEventListener("keydown",function(event){
    if(event.repeat)return;
    keys=(keys+event.key.toLowerCase()).slice(-3);
    if(keys==="www")show();
  });
})();
