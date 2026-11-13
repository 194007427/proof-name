/* Full-viewport celebration: layered volleys, luminous comet trails, one clock. */
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
  var schedule = [0, 130, 270, 430, 650], frameLength = 1000 / 60;
  var drag = 0.985, gravity = 0.05;
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
  function burst(scene, index, now) {
    var w=window.innerWidth,h=window.innerHeight;
    var positions=[[0.5,0.38],[0.23,0.51],[0.78,0.29],[0.43,0.68],[0.65,0.45]];
    var point=[w*(positions[index][0]+scene.offset),h*positions[index][1]];
    var count=[440,260,260,220,320][index];
    var power=[23,17,19,15,22][index];
    var pair=palette[(scene.color+index*2+(index===4?1:0))%palette.length];
    for (var i=0;i<count;i++) {
      var angle = Math.PI * 2 * i / count + Math.random() * 0.14;
      // A fast outer crown and a denser inner bloom, rather than one flat disk.
      var crown=i%4===0;
      var speed=power*(crown?0.92+Math.random()*0.38:0.22+Math.random()*0.66);
      parts.push({x:point[0],y:point[1],x0:point[0],y0:point[1],born:now,
        vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
        decay:0.0035+Math.random()*0.0045,color:pair[Math.random()<0.7?0:1],
        radius:crown?1.8+Math.random()*2.4:2.2+Math.random()*3.2,
        trail:crown?3.3:2.1});
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
    if(reduced || age>=380) {restoreTargets();return;}
    var points=[[0,0],[-11,7],[9,-6],[-4,3],[0,0]];
    var progress=easeOut(age/380)*4, index=Math.min(3,Math.floor(progress));
    var fraction=progress-index;
    var dx=points[index][0]+(points[index+1][0]-points[index][0])*fraction;
    var dy=points[index][1]+(points[index+1][1]-points[index][1])*fraction;
    targets.forEach(function(target) {
      var base=target.transform && target.transform!=="none"?target.transform+" ":"";
      target.element.style.transform=base+"translate3d("+dx+"px,"+dy+"px,0)";
    });
  }
  function paintParticles(now) {
    // Sample the tail at a fixed age offset: its length must not depend on FPS.
    for(var i=parts.length-1;i>=0;i--) {
      var p=parts[i], n=1+(now-p.born)/frameLength;
      var alpha=1-p.decay*n;
      if(alpha<=0) {parts.splice(i,1);continue;}
      var distance=(1-Math.pow(drag,n))/(1-drag);
      var tailAge=Math.max(0,n-p.trail);
      var tailDistance=(1-Math.pow(drag,tailAge))/(1-drag);
      var px=p.x0+p.vx*tailDistance;
      var py=p.y0+p.vy*tailDistance+gravity*drag/(1-drag)*(tailAge-tailDistance);
      p.x=p.x0+p.vx*distance;
      p.y=p.y0+p.vy*distance+gravity*drag/(1-drag)*(n-distance);
      ctx.globalAlpha=alpha*0.2;ctx.strokeStyle=p.color;ctx.lineWidth=p.radius*4.8;
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
      while(scene.next<schedule.length && now-scene.started>=schedule[scene.next]) burst(scene,scene.next++,now);
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
    scenes.push({started:null,next:0,offset:(Math.random()-0.5)*0.12,
      color:Math.floor(Math.random()*palette.length)});
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
