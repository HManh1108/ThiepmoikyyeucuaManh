
(function () {
	'use strict';
	var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var root = document.documentElement;
	var css = getComputedStyle(root);
	function col(n, d) { return (css.getPropertyValue('--fx' + n) || '').trim() || d; }
	var C = [col(1, '#ff6b8b'), col(2, '#ffd166'), col(3, '#ffffff')];
	var kind = root.getAttribute('data-fx') || 'spark';

	/* ================= Hạt (canvas) ================= */
	var cv = document.createElement('canvas'), ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
	cv.className = 'fx-canvas';
	cv.setAttribute('aria-hidden', 'true');
	var parts = [], wind = 0, lastY = window.scrollY;
	function size() {
		var r = cv.getBoundingClientRect();
		W = r.width; H = r.height;
		cv.width = W * dpr; cv.height = H * dpr;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}
	function rnd(a, b) { return a + Math.random() * (b - a); }
	function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

	function ambient(y) {
		var p = { x: rnd(0, W), y: y == null ? rnd(-H, 0) : y, r: rnd(3, 7), rot: rnd(0, 6.3), vr: rnd(-.03, .03), vx: rnd(-.2, .2), vy: rnd(.3, .9), c: pick(C), a: rnd(.45, .9), ph: rnd(0, 6.3), amb: 1 };
		if (kind === 'chalk') { p.r = rnd(.8, 2.2); p.vy = rnd(.05, .25); p.a = rnd(.15, .45); p.c = '#f3f0e6'; }
		if (kind === 'dust') { p.r = rnd(.6, 1.8); p.vy = rnd(-.15, .15); p.vx = rnd(-.15, .15); p.a = rnd(.1, .35); p.c = '#3a2a1c'; p.y = rnd(0, H); }
		if (kind === 'spark' || kind === 'star') { p.vy = rnd(-.35, -.1); p.y = y == null ? rnd(0, H) : H + 10; p.r = rnd(2, 5); }
		return p;
	}
	function shape(p, al) {
		ctx.save();
		ctx.globalAlpha = al;
		ctx.translate(p.x, p.y);
		ctx.rotate(p.rot);
		ctx.fillStyle = p.c;
		var r = p.r, k = p.shape || kind;
		if (k === 'petal') { ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * .8, 0, 0, 6.29); ctx.fill(); }
		else if (k === 'star') { ctx.beginPath(); for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5, rr = i % 2 ? r * .45 : r * 1.2; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
		else if (k === 'spark') { ctx.beginPath(); ctx.moveTo(0, -r * 1.6); ctx.quadraticCurveTo(0, 0, r * 1.6, 0); ctx.quadraticCurveTo(0, 0, 0, r * 1.6); ctx.quadraticCurveTo(0, 0, -r * 1.6, 0); ctx.quadraticCurveTo(0, 0, 0, -r * 1.6); ctx.fill(); }
		else if (k === 'conf') { ctx.fillRect(-r, -r * .45, r * 2, r * .9); }
		else { ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.29); ctx.fill(); }
		ctx.restore();
	}
	var t = 0;
	function loop() {
		t++;
		ctx.clearRect(0, 0, W, H);
		wind *= 0.94;
		for (var i = parts.length - 1; i >= 0; i--) {
			var p = parts[i];
			if (p.amb) {
				p.x += p.vx + Math.sin(t / 60 + p.ph) * .35 + wind;
				p.y += p.vy;
				p.rot += p.vr;
				var al = p.a;
				if (kind === 'spark' || kind === 'star') al = p.a * (.55 + .45 * Math.sin(t / 18 + p.ph));
				if (kind === 'dust' && Math.random() < .004) { ctx.globalAlpha = .12; ctx.fillStyle = '#2b1d12'; ctx.fillRect(rnd(0, W), 0, 1, H); }
				if (p.y > H + 20 || p.y < -40 || p.x < -40 || p.x > W + 40) parts[i] = ambient(p.vy < 0 ? H + 10 : -10);
				shape(p, al);
			} else {
				p.life -= 1;
				p.vy += p.g;
				p.vx *= .985;
				p.x += p.vx; p.y += p.vy; p.rot += p.vr;
				if (p.life <= 0) { parts.splice(i, 1); continue; }
				shape(p, Math.min(1, p.life / 30));
			}
		}
		requestAnimationFrame(loop);
	}
	function spawn(x, y, n, opt) {
		opt = opt || {};
		for (var i = 0; i < n; i++) {
			var a = opt.angle != null ? opt.angle + rnd(-.6, .6) : rnd(0, 6.3), s = rnd(opt.min || 2, opt.max || 8);
			parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opt.up || 2), g: opt.g == null ? .16 : opt.g, r: rnd(3, 6), rot: rnd(0, 6.3), vr: rnd(-.2, .2), c: pick(C), life: rnd(50, 90), shape: opt.shape || pick(['conf', 'conf', kind === 'chalk' || kind === 'dust' ? 'conf' : kind]) });
		}
	}
	function toCanvas(cx, cy) { var r = cv.getBoundingClientRect(); return [cx - r.left, cy - r.top]; }

	/* ================= Chữ bay từng ký tự ================= */
	function split() {
		document.querySelectorAll('[data-split]').forEach(function (el) {
			if (el.dataset.splitDone) return;
			el.dataset.splitDone = 1;
			var i = 0;
			(function walk(node) {
				[].slice.call(node.childNodes).forEach(function (n) {
					if (n.nodeType === 3) {
						var frag = document.createDocumentFragment();
						n.textContent.normalize('NFC').split(/(\s+)/).forEach(function (w) {
							if (!w) return;
							if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(w)); return; }
							var word = document.createElement('span');
							word.className = 'fx-w';
							Array.from(w).forEach(function (ch) {
								var s = document.createElement('span');
								s.className = 'fx-ch';
								s.style.setProperty('--ci', i++);
								s.textContent = ch;
								word.appendChild(s);
							});
							frag.appendChild(word);
						});
						n.parentNode.replaceChild(frag, n);
					} else if (n.nodeType === 1) walk(n);
				});
			})(el);
			if (!el.classList.contains('rv')) {
				var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }); }, { threshold: .2 });
				io.observe(el);
			}
		});
	}

	/* ================= Gõ chữ từng ký tự ([data-type]) ================= */
	function typer() {
		document.querySelectorAll('[data-type]').forEach(function (el) {
			var full = Array.from(el.textContent.normalize('NFC'));
			if (!full.length) return;
			el.style.minHeight = el.offsetHeight + 'px';
			el.textContent = '';
			el.classList.add('fx-typing');
			var io = new IntersectionObserver(function (es) {
				if (!es[0].isIntersecting) return;
				io.disconnect();
				var i = 0;
				(function step() {
					el.textContent = full.slice(0, ++i).join('');
					if (i < full.length) setTimeout(step, /[,.!—]/.test(full[i - 1]) ? 160 : 26);
					else el.classList.remove('fx-typing');
				})();
			}, { threshold: .4 });
			io.observe(el);
		});
	}

	/* ================= Parallax ================= */
	var pars = [];
	function parallax() {
		pars = [].slice.call(document.querySelectorAll('[data-par]'));
		if (!pars.length) return;
		var ticking = false;
		function upd() {
			ticking = false;
			var vh = window.innerHeight;
			pars.forEach(function (el) {
				var r = el.getBoundingClientRect(), k = parseFloat(el.getAttribute('data-par')) || .15;
				var mid = r.top + r.height / 2 - vh / 2;
				el.style.translate = '0 ' + (-mid * k).toFixed(1) + 'px';
			});
		}
		window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
		upd();
	}

	/* ================= Nghiêng 3D ================= */
	function tilt() {
		var els = [].slice.call(document.querySelectorAll('[data-tilt]'));
		if (!els.length) return;
		els.forEach(function (el) {
			el.classList.add('fx-tilt');
			var g = document.createElement('i');
			g.className = 'fx-glare';
			el.appendChild(g);
			function set(px, py) {
				el.style.setProperty('--rx', ((.5 - py) * 14).toFixed(2) + 'deg');
				el.style.setProperty('--ry', ((px - .5) * 16).toFixed(2) + 'deg');
				el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
				el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
			}
			el.addEventListener('pointermove', function (e) { var r = el.getBoundingClientRect(); set((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height); el.classList.add('fx-tilting'); });
			el.addEventListener('pointerleave', function () { el.classList.remove('fx-tilting'); set(.5, .5); });
			set(.5, .5);
		});
		// Con quay điện thoại: nghiêng máy là ảnh nghiêng theo.
		window.addEventListener('deviceorientation', function (e) {
			if (e.gamma == null) return;
			var px = Math.max(0, Math.min(1, .5 + e.gamma / 60)), py = Math.max(0, Math.min(1, .5 + (e.beta - 40) / 70));
			els.forEach(function (el) { if (!el.classList.contains('fx-tilting')) { el.style.setProperty('--rx', ((.5 - py) * 12).toFixed(2) + 'deg'); el.style.setProperty('--ry', ((px - .5) * 14).toFixed(2) + 'deg'); el.style.setProperty('--mx', (px * 100) + '%'); el.style.setProperty('--my', (py * 100) + '%'); } });
		}, true);
	}

	/* ================= Thẻ cào ================= */
	function scratch() {
		document.querySelectorAll('[data-scratch]').forEach(function (box) {
			box.classList.add('fx-scratch');
			var c = document.createElement('canvas'), x = c.getContext('2d'), done = false, moves = 0, down = false, last = null;
			c.className = 'fx-scratch-c';
			box.appendChild(c);
			var hint = document.createElement('span');
			hint.className = 'fx-scratch-hint';
			hint.textContent = box.getAttribute('data-scratch') || 'Cào để xem';
			box.appendChild(hint);
			function paint() {
				var r = box.getBoundingClientRect();
				c.width = r.width * dpr; c.height = r.height * dpr;
				x.setTransform(dpr, 0, 0, dpr, 0, 0);
				var cs = getComputedStyle(box), a = cs.getPropertyValue('--foil1').trim() || '#c9c9c9', b = cs.getPropertyValue('--foil2').trim() || '#f2f2f2';
				var g = x.createLinearGradient(0, 0, r.width, r.height);
				g.addColorStop(0, a); g.addColorStop(.5, b); g.addColorStop(1, a);
				x.fillStyle = g;
				x.fillRect(0, 0, r.width, r.height);
				for (var i = 0; i < r.width * r.height / 30; i++) { x.fillStyle = 'rgba(255,255,255,' + Math.random() * .25 + ')'; x.fillRect(Math.random() * r.width, Math.random() * r.height, 1, 1); }
				x.globalCompositeOperation = 'destination-out';
			}
			function pos(e) { var r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
			function draw(p) {
				x.lineWidth = 34; x.lineCap = 'round';
				x.beginPath();
				if (last) { x.moveTo(last[0], last[1]); x.lineTo(p[0], p[1]); x.stroke(); }
				x.arc(p[0], p[1], 17, 0, 6.29); x.fill();
				last = p;
				if (++moves % 8 === 0) check();
			}
			function check() {
				var d = x.getImageData(0, 0, c.width, c.height).data, clear = 0, n = 0;
				for (var i = 3; i < d.length; i += 64) { n++; if (d[i] < 40) clear++; }
				if (clear / n > .5) finish();
			}
			function finish() {
				if (done) return;
				done = true;
				box.classList.add('fx-scratched');
				var r = box.getBoundingClientRect();
				FX.burst(r.left + r.width / 2, r.top + r.height / 2, 60);
				if (navigator.vibrate) navigator.vibrate(30);
			}
			c.addEventListener('pointerdown', function (e) { down = true; last = null; hint.style.opacity = 0; c.setPointerCapture(e.pointerId); draw(pos(e)); });
			c.addEventListener('pointermove', function (e) { if (down && !done) draw(pos(e)); });
			c.addEventListener('pointerup', function () { down = false; last = null; });
			if (document.readyState === 'complete') paint(); else window.addEventListener('load', paint);
			setTimeout(paint, 60);
		});
	}

	/* ================= Kéo thả sticker ================= */
	function drag() {
		document.querySelectorAll('[data-drag]').forEach(function (el) {
			var sx, sy, ox = 0, oy = 0, on = false;
			el.style.touchAction = 'none';
			el.addEventListener('pointerdown', function (e) { on = true; el.style.animation = 'none'; sx = e.clientX - ox; sy = e.clientY - oy; el.setPointerCapture(e.pointerId); el.classList.add('fx-dragging'); });
			el.addEventListener('pointermove', function (e) { if (!on) return; ox = e.clientX - sx; oy = e.clientY - sy; el.style.translate = ox + 'px ' + oy + 'px'; });
			el.addEventListener('pointerup', function (e) { on = false; el.classList.remove('fx-dragging'); FX.burst(e.clientX, e.clientY, 10, { max: 4, up: 1 }); });
		});
	}

	/* ================= Nút gợn sóng ================= */
	function ripple() {
		document.addEventListener('pointerdown', function (e) {
			var b = e.target.closest('.btn');
			if (!b) return;
			var r = b.getBoundingClientRect(), s = document.createElement('i');
			s.className = 'fx-ripple';
			s.style.left = (e.clientX - r.left) + 'px';
			s.style.top = (e.clientY - r.top) + 'px';
			b.appendChild(s);
			setTimeout(function () { s.remove(); }, 650);
		});
	}

	/* ================= Số đếm ngược lật ================= */
	function flips() {
		var mo = new MutationObserver(function (ms) {
			ms.forEach(function (m) {
				var el = m.target.nodeType === 3 ? m.target.parentNode : m.target;
				if (!el || !el.matches || !el.matches('[data-cd-d],[data-cd-h],[data-cd-m],[data-cd-s]')) return;
				el.classList.remove('fx-flip');
				void el.offsetWidth;
				el.classList.add('fx-flip');
			});
		});
		document.querySelectorAll('[data-cd-d],[data-cd-h],[data-cd-m],[data-cd-s]').forEach(function (el) { mo.observe(el, { childList: true, characterData: true, subtree: true }); });
	}

	/* ================= Thanh tiến trình cuộn ================= */
	function progress() {
		var bar = document.createElement('div');
		bar.className = 'fx-progress';
		document.body.appendChild(bar);
		window.addEventListener('scroll', function () {
			var h = document.documentElement.scrollHeight - window.innerHeight;
			bar.style.transform = 'scaleX(' + (h > 0 ? window.scrollY / h : 0) + ')';
			var dy = window.scrollY - lastY;
			lastY = window.scrollY;
			wind = Math.max(-4, Math.min(4, wind + dy * .02));
		}, { passive: true });
	}

	window.FX = {
		burst: function (cx, cy, n, opt) { if (reduce) return; var p = toCanvas(cx, cy); spawn(p[0], p[1], n || 40, opt); },
		rain: function (n) { if (reduce) return; for (var i = 0; i < (n || 80); i++) setTimeout(function () { spawn(rnd(0, W), -10, 1, { angle: Math.PI / 2, min: 1, max: 3, up: 0, g: .06 }); }, i * 25); }
	};

	function init() {
		split();
		parallax();
		ripple();
		flips();
		progress();
		if (!reduce) typer();
		if (reduce) { document.querySelectorAll('[data-scratch]').forEach(function (b) { b.classList.add('fx-scratched'); }); return; }
		document.body.appendChild(cv);
		size();
		window.addEventListener('resize', size);
		var n = kind === 'dust' ? 40 : kind === 'chalk' ? 34 : 22;
		for (var i = 0; i < n; i++) parts.push(ambient());
		loop();
		tilt();
		scratch();
		drag();
		// Vệt lấp lánh theo ngón tay.
		var lt = 0;
		window.addEventListener('pointermove', function (e) {
			var now = Date.now();
			if (now - lt < 40 || document.querySelector('.ky-intro:not(.done)')) return;
			lt = now;
			var p = toCanvas(e.clientX, e.clientY);
			spawn(p[0], p[1], 2, { min: .5, max: 1.6, up: .4, g: .03, shape: kind === 'chalk' || kind === 'dust' ? 'dot' : kind });
		}, { passive: true });
		// Mở thiệp: pháo giấy + rung nhẹ.
		document.addEventListener('ky:open', function () { setTimeout(function () { FX.burst(window.innerWidth / 2, window.innerHeight * .45, 90, { max: 11, up: 4 }); FX.rain(60); }, 350); });
		var intro = document.querySelector('.ky-intro');
		if (intro) intro.addEventListener('click', function () { if (navigator.vibrate) navigator.vibrate([20, 40, 30]); });
		// Gửi lưu bút: pháo giấy từ nút gửi.
		document.querySelectorAll('form[data-ky-form]').forEach(function (f) {
			f.addEventListener('submit', function () { setTimeout(function () { if (f.classList.contains('sent')) { var b = f.querySelector('[type=submit]').getBoundingClientRect(); FX.burst(b.left + b.width / 2, b.top, 70, { angle: -Math.PI / 2, max: 12, up: 2 }); } }, 50); });
		});
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
