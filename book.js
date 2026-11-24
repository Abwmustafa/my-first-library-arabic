(function () {
  var MM = 96 / 25.4;

  // Library thumbnails: scale each cover to its box.
  function fitThumbs() {
    document.querySelectorAll('.fit').forEach(function (el) {
      var w = el.parentNode.clientWidth;
      el.style.transform = 'scale(' + (w / (parseFloat(el.dataset.w) * MM)) + ')';
    });
  }
  if (!window.BOOK) {
    fitThumbs();
    addEventListener('resize', fitThumbs);
    return;
  }

  // ---------------- reader
  var book = document.getElementById('book'), stage = document.getElementById('stage');
  var pages = [].slice.call(book.querySelectorAll('.p'));
  var N = pages.length, seek = document.getElementById('seek'), where = document.getElementById('where');
  var prevBtn = document.getElementById('prev'), nextBtn = document.getElementById('next');
  var end = document.getElementById('end'), progress = document.querySelector('.progress');
  var AR = '٠١٢٣٤٥٦٧٨٩';
  function ar(n) { return String(n).replace(/[0-9]/g, function (d) { return AR[d]; }); }

  var spread = false, cur = 1;   // cur = first page number shown

  // In spread mode: page 1 alone, then (2,3), (4,5) ... and the last page alone.
  function viewOf(n) {
    if (!spread || n === 1 || n === N) return [n];
    var a = n % 2 === 0 ? n : n - 1;
    return a + 1 >= N ? [a] : [a, a + 1];
  }
  function stepNext(n) { var v = viewOf(n); return v[v.length - 1] + 1; }
  function stepPrev(n) { var v = viewOf(n); return v[0] - 1 < 1 ? 0 : viewOf(v[0] - 1)[0]; }

  function measure() {
    var r = stage.getBoundingClientRect();
    spread = r.width / r.height > 1.45 && r.width > 700;
    book.classList.toggle('spread', spread);
  }

  function layout() {
    var r = stage.getBoundingClientRect();
    var v = viewOf(cur);
    var w = (spread ? 2 : 1) * 120 * MM, h = 120 * MM;
    var pad = Math.min(r.width, r.height) < 500 ? 12 : 28;
    var s = Math.min((r.width - pad * 2) / w, (r.height - pad * 2) / h);
    // a lone cover in spread mode keeps the spread's scale and sits on its own side
    var shift = 0;
    if (spread && v.length === 1) shift = (v[0] === 1 ? -1 : 1) * 120 * MM / 2;
    book.style.transform = 'translate(-50%, -50%) translateX(' + (shift * s) + 'px) scale(' + s + ')';
  }

  // Animal sounds: tapping an animal plays its sound (sounds/<name>.mp3) and makes it wiggle.
  var sounds = {}, playing = null;
  function sound(k) {
    if (!sounds[k]) { sounds[k] = new Audio('sounds/' + k + '.mp3?v=5221f1f7'); sounds[k].preload = 'auto'; }
    return sounds[k];
  }
  function hush() { if (playing) { playing.pause(); playing = null; } }
  function animal(d) {
    stopTalk();
    d.classList.remove('wiggle'); void d.offsetWidth; d.classList.add('wiggle');
    var k = d.getAttribute('data-sound');
    if (!k) return;
    var a = sound(k);
    if (playing && playing !== a) playing.pause();
    try { a.currentTime = 0; } catch (err) {}
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
    playing = a;
  }
  // Pronunciation: the speaker button (or a tap on the word) says the words on the page. A recording
  // (data-voice) is played when there is one; otherwise the device's Arabic voice reads the text (data-say).
  var synth = window.speechSynthesis, arVoice = null, talkId = 0, voiceAudio = null;
  var sayBtn = document.getElementById('say');
  var recorded = !!book.querySelector('.p[data-voice]');
  function score(v) {
    // Natural-sounding voices first, then Modern Standard Arabic (ar-SA, plain ar) over regional ones.
    return (/natural|online|neural|premium|enhanced/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) +
           (/^ar([-_]sa)?$/i.test(v.lang) ? 2 : 0) + (v.localService ? 1 : 0);
  }
  function pickVoice() {
    if (!synth) return;
    var vs = synth.getVoices().filter(function (v) { return /^ar([-_]|$)/i.test(v.lang); });
    vs.sort(function (a, b) { return score(b) - score(a); });
    arVoice = vs[0] || null;
    updateSay();
  }
  function canSay(p) { return !!(p && p.getAttribute('data-say') && (p.getAttribute('data-voice') || arVoice)); }
  function updateSay() {
    sayBtn.hidden = !(arVoice || recorded);
    sayBtn.disabled = !viewOf(cur).some(function (k) { return canSay(pages[k - 1]); });
  }
  function mark(p) {
    book.querySelectorAll('.t.say.talking').forEach(function (e) { e.classList.remove('talking'); });
    if (p) p.querySelectorAll('.t.say').forEach(function (e) { e.classList.add('talking'); });
    sayBtn.classList.toggle('talking', !!p);
  }
  function stopTalk() {
    talkId++;
    if (synth) synth.cancel();
    if (voiceAudio) { voiceAudio.pause(); voiceAudio = null; }
    mark(null);
  }
  function tts(p, done) {
    if (!synth || !arVoice) { done(); return; }
    var u = new SpeechSynthesisUtterance(p.getAttribute('data-say'));
    u.voice = arVoice; u.lang = arVoice.lang; u.rate = 0.8;
    u.onend = done; u.onerror = done;
    synth.speak(u);
  }
  function say(ks) {
    hush(); stopTalk();
    var id = talkId, list = ks.map(function (k) { return pages[k - 1]; }).filter(canSay), i = 0;
    function step() {
      if (id !== talkId) return;
      if (i >= list.length) { mark(null); return; }
      var p = list[i++], done = function () { if (id === talkId) step(); };
      mark(p);
      var src = p.getAttribute('data-voice');
      if (src) {
        voiceAudio = new Audio(src);
        voiceAudio.onended = done;
        var pr = voiceAudio.play();
        if (pr && pr.catch) pr.catch(function () { tts(p, done); });
      } else tts(p, done);
    }
    step();
  }
  if (synth) {
    if (synth.addEventListener) synth.addEventListener('voiceschanged', pickVoice); else synth.onvoiceschanged = pickVoice;
  }
  sayBtn.addEventListener('click', function () { say(viewOf(cur)); });

  book.addEventListener('animationend', function (e) {
    var d = e.target.closest && e.target.closest('.disc.wiggle');
    if (d) d.classList.remove('wiggle');
  });

  // Question pages: tapping the right picture sets off a celebration (confetti, a chime and applause);
  // a wrong one gives a little shake, so the child can try again.
  var fx = null, bits = [], fxOn = false, actx = null;
  var calm = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var COLORS = ['#E53935', '#FDD835', '#43A047', '#1E88E5', '#8E24AA', '#FB8C00', '#EC407A'];
  function tones(list) {        // [frequency, start, length, loudness, wave] notes, made on the spot
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      actx = actx || new AC();
      if (actx.state === 'suspended') actx.resume();
      var t0 = actx.currentTime + 0.02;
      list.forEach(function (n) {
        var o = actx.createOscillator(), g = actx.createGain(), t = t0 + n[1];
        o.type = n[4] || 'triangle';
        o.frequency.setValueAtTime(n[0], t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(n[3], t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + n[2]);
        o.connect(g); g.connect(actx.destination);
        o.start(t); o.stop(t + n[2] + 0.05);
      });
    } catch (err) {}
  }
  function starPath(ctx, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r;
      ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q);
    }
    ctx.closePath(); ctx.fill();
  }
  var LIFE = 1600, lastT = 0;    // each piece lasts 1.6 s, however fast the screen draws
  function tick(now) {
    var ctx = fx.getContext('2d'), W = innerWidth, H = innerHeight, g = Math.max(0.25, Math.min(W, H) / 2200);
    var real = now - (lastT || now), k = Math.min(real, 50) / 16.7, drag = Math.pow(0.985, k);
    lastT = now;
    ctx.clearRect(0, 0, W, H);
    bits.forEach(function (b) { b.age += real; });
    bits = bits.filter(function (b) { return b.age < LIFE && b.y < H + 40; });
    bits.forEach(function (b) {
      b.vy += g * k; b.vx *= drag; b.vy *= drag; b.x += b.vx * k; b.y += b.vy * k; b.r += b.vr * k;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, (LIFE - b.age) / 400));
      ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c;
      if (b.star) starPath(ctx, b.s * 0.75); else ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      ctx.restore();
    });
    if (bits.length) requestAnimationFrame(tick); else { fxOn = false; lastT = 0; ctx.clearRect(0, 0, W, H); }
  }
  function burst(x, y) {
    if (calm) return;
    if (!fx) { fx = document.createElement('canvas'); fx.id = 'confetti'; document.body.appendChild(fx); }
    var dpr = window.devicePixelRatio || 1;
    if (!fxOn) {
      fx.width = innerWidth * dpr; fx.height = innerHeight * dpr;
      fx.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    var sp = Math.max(6, Math.min(innerWidth, innerHeight) / 70);
    for (var i = 0; i < 80; i++) {
      var a = Math.random() * Math.PI * 2, v = sp * (0.35 + Math.random() * 0.9);
      bits.push({x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.9, r: Math.random() * 6,
                 vr: (Math.random() - 0.5) * 0.4, s: sp * (0.9 + Math.random() * 0.8),
                 c: COLORS[i % COLORS.length], star: i % 4 === 0, age: 0});
    }
    if (!fxOn) { fxOn = true; requestAnimationFrame(tick); }
  }
  function celebrate(c) {
    hush(); stopTalk();
    c.parentNode.querySelectorAll('.choice').forEach(function (o) {
      o.classList.remove('yay', 'nope');
      o.classList.toggle('dim', o !== c);
    });
    void c.offsetWidth; c.classList.add('yay');
    var r = c.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
    tones([[1046.5, 0, 0.45, 0.2], [1318.5, 0.09, 0.45, 0.2], [1568, 0.18, 0.5, 0.2], [2093, 0.27, 0.9, 0.22],
           [3136, 0.3, 0.6, 0.05, 'sine'], [4186, 0.36, 0.5, 0.04, 'sine']]);
    var a = sound('cheer');
    a.volume = 0.55;
    try { a.currentTime = 0; } catch (err) {}
    var p = a.play();
    if (p && p.catch) p.catch(function () {});
    playing = a;
  }
  function nope(c) {
    hush(); stopTalk();
    c.classList.remove('nope'); void c.offsetWidth; c.classList.add('nope');
    tones([[330, 0, 0.16, 0.12, 'sine'], [247, 0.13, 0.22, 0.12, 'sine']]);
  }
  function resetChoices() {
    book.querySelectorAll('.choice.yay, .choice.dim, .choice.nope').forEach(function (o) {
      o.classList.remove('yay', 'dim', 'nope');
    });
  }

  function show(n, dir) {
    if (n < 1) n = 1;
    if (n > N) n = N;
    measure();
    cur = viewOf(n)[0];
    var v = viewOf(cur);
    pages.forEach(function (p, i) {
      var k = i + 1, on = v.indexOf(k) >= 0;
      p.classList.toggle('on', on);
      p.classList.toggle('r', on && v.length === 2 && k === v[0]);
      p.classList.toggle('l', on && v.length === 2 && k === v[1]);
    });
    layout();
    hush();
    stopTalk();
    resetChoices();
    updateSay();
    v.forEach(function (k) {     // load the sounds of the animals on view, so they play at once
      pages[k - 1].querySelectorAll('.disc[data-sound]').forEach(function (d) {
        if (d.getAttribute('data-sound')) sound(d.getAttribute('data-sound'));
      });
      if (pages[k - 1].querySelector('.choice')) sound('cheer');
    });
    book.classList.remove('turn-next', 'turn-prev');
    if (dir) { void book.offsetWidth; book.classList.add(dir > 0 ? 'turn-next' : 'turn-prev'); }
    var last = v[v.length - 1];
    seek.value = cur;
    seek.style.setProperty('--pct', (N > 1 ? (cur - 1) / (N - 1) * 100 : 100) + '%');   // the filled part of the slider
    where.textContent = v.length === 2 ? ar(v[0]) + '–' + ar(v[1]) + ' / ' + ar(N) : ar(v[0]) + ' / ' + ar(N);
    prevBtn.disabled = cur <= 1;
    nextBtn.disabled = last >= N;
    end.hidden = last < N;
    progress.hidden = !end.hidden;
    again.hidden = end.hidden;
    document.body.classList.toggle('at-end', !end.hidden);
    history.replaceState(null, '', '#' + cur);
  }

  function next() { var n = stepNext(cur); if (n <= N) show(n, 1); }
  function prev() { var n = stepPrev(cur); if (n >= 1) show(n, -1); }

  seek.max = N;
  seek.addEventListener('input', function () { show(+seek.value, 0); });
  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  var again = document.getElementById('again');
  again.addEventListener('click', function () { show(1, -1); });
  addEventListener('keydown', function (e) {
    if (e.target === seek) return;
    if (e.key === 'ArrowLeft' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    else if (e.key === 'Home') show(1, -1);
    else if (e.key === 'End') show(N, 1);
  });

  // Swipe: in an Arabic book you pull the page from left to right to go forward.
  var x0 = null, y0 = 0, t0 = 0;
  stage.addEventListener('pointerdown', function (e) { x0 = e.clientX; y0 = e.clientY; t0 = Date.now(); });
  stage.addEventListener('pointerup', function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0, dy = e.clientY - y0, dt = Date.now() - t0;
    x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) { dx > 0 ? next() : prev(); return; }
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 500) {    // a tap: left side = forward, right side = back
      var c = e.target.closest && e.target.closest('.choice');
      if (c) { c.hasAttribute('data-ok') ? celebrate(c) : nope(c); return; }   // ... unless it's an answer
      var d = e.target.closest && e.target.closest('.disc.animal');
      if (d) { animal(d); return; }                              // ... or an animal
      var w = e.target.closest && e.target.closest('.t.say'), wp = w && w.closest('.p');
      if (wp && canSay(wp)) { say([+wp.getAttribute('data-n')]); return; }   // ... or on a word
      var r = stage.getBoundingClientRect();
      (e.clientX - r.left) < r.width / 2 ? next() : prev();
    }
  });

  var fullBtn = document.getElementById('full');
  if (!document.documentElement.requestFullscreen) fullBtn.hidden = true;
  fullBtn.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen();
  });

  addEventListener('resize', function () { show(cur, 0); });
  addEventListener('hashchange', function () {
    var n = parseInt(location.hash.slice(1), 10);
    if (n >= 1 && n <= N && n !== cur) show(n, n > cur ? 1 : -1);
  });
  var start = parseInt(location.hash.slice(1), 10);
  show(start >= 1 && start <= N ? start : 1, 0);
  pickVoice();
})();
