/*
 * Bộ xử lý chung cho các mẫu thiệp kỷ yếu.
 *
 * Dữ liệu: window.KY_DATA (data.js), mẫu có thể đè ảnh minh hoạ bằng window.KY_DEMO.
 * Móc nối trong HTML:
 *   data-k="truong"              -> điền chữ (đường dẫn kiểu "suKien.diaDiem")
 *   data-k-src / data-k-href     -> điền thuộc tính src / href
 *   data-date="ngay|thang|nam|thu|gio|dmy|dai|am"  -> định dạng ngày của suKien.ngayGio
 *   data-khach                   -> tên khách (?khach=...), mặc định "Bạn"
 *   data-list="lichTrinh"        -> lặp <template> con, bên trong dùng data-i="gio"
 *   data-album                   -> dựng album ảnh (mở lớn khi chạm)
 *   data-cd-d/h/m/s              -> đếm ngược tới suKien.ngayGio
 *   .ky-intro                    -> màn mở thiệp: chạm thì thêm .open, 1.2s sau thêm .done
 *   .rv                          -> hiện dần khi cuộn (thêm .in)
 *   form[data-ky-form]           -> lời chúc + xác nhận tham dự (gửi về window.KY_SUBMIT nếu có)
 *   [data-share] [data-cal] [data-music]
 */
(function () {
	'use strict';

	var D = Object.assign({}, window.KY_DATA || {}, window.KY_DEMO || {});
	var q = new URLSearchParams(location.search);
	// Khách mời: app gửi window.KY_GUEST = { ten, kieu: 'ban' | 'lon' } (link riêng từng khách); bản tĩnh dùng ?khach=Tên (&xh=lon).
	var G = window.KY_GUEST || {};
	var khach = String(G.ten || q.get('khach') || '').trim().slice(0, 60);
	// Người lớn (gia đình, thầy cô): đổi lời mời + câu xưng hô sang bản trang trọng. Không áp dụng khi chủ thiệp đang sửa.
	var LON = !window.KY_EDIT && !q.has('sua') && (G.kieu === 'lon' || (!G.kieu && q.get('xh') === 'lon'));
	if (LON) document.documentElement.classList.add('ky-lon');

	function get(path) {
		return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, D);
	}

	/* ---------- Ngày tháng ---------- */
	var when = null;
	function parseWhen() {
		when = D.suKien && D.suKien.ngayGio ? new Date(D.suKien.ngayGio) : null;
		if (when && isNaN(when)) when = null;
	}
	parseWhen();
	var THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
	function p2(n) { return (n < 10 ? '0' : '') + n; }

	// Âm lịch (thuật toán Hồ Ngọc Đức, múi giờ +7).
	function jd(d, m, y) {
		var a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3;
		var j = d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
		return j < 2299161 ? d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083 : j;
	}
	function newMoon(k) {
		var T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = Math.PI / 180;
		var Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
		var M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3, Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3, F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
		var C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M) - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr) - 0.0004 * Math.sin(dr * 3 * Mpr) + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr)) - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M)) - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr)) + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
		var dt = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3 : -0.000278 + 0.000265 * T + 0.000262 * T2;
		return Math.floor(Jd1 + C1 - dt + 0.5 + 7 / 24);
	}
	function sunLong(j) {
		var T = (j - 2451545.5 - 7 / 24) / 36525, T2 = T * T, dr = Math.PI / 180;
		var M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2, L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
		var DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M) + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
		var L = (L0 + DL) * dr;
		L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
		return Math.floor(L / Math.PI * 6);
	}
	function m11(y) {
		var off = jd(31, 12, y) - 2415021, k = Math.floor(off / 29.530588853), nm = newMoon(k);
		return sunLong(nm) >= 9 ? newMoon(k - 1) : nm;
	}
	function leapOff(a11) {
		var k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5), last, i = 1, arc = sunLong(newMoon(k + i));
		do { last = arc; i++; arc = sunLong(newMoon(k + i)); } while (arc !== last && i < 14);
		return i - 1;
	}
	function lunar(d, m, y) {
		var day = jd(d, m, y), k = Math.floor((day - 2415021.076998695) / 29.530588853), ms = newMoon(k + 1);
		if (ms > day) ms = newMoon(k);
		var a11 = m11(y), b11 = a11, ly;
		if (a11 >= ms) { ly = y; a11 = m11(y - 1); } else { ly = y + 1; b11 = m11(y + 1); }
		var ld = day - ms + 1, diff = Math.floor((ms - a11) / 29), lm = diff + 11, leap = false;
		if (b11 - a11 > 365) { var lo = leapOff(a11); if (diff >= lo) { lm = diff + 10; if (diff === lo) leap = true; } }
		if (lm > 12) lm -= 12;
		if (lm >= 11 && diff < 4) ly -= 1;
		return [ld, lm, ly, leap];
	}
	var CAN = ['Canh', 'Tân', 'Nhâm', 'Quý', 'Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ'], CHI = ['Thân', 'Dậu', 'Tuất', 'Hợi', 'Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi'];

	function fmt(kind) {
		if (!when) return '';
		var d = when.getDate(), m = when.getMonth() + 1, y = when.getFullYear();
		switch (kind) {
			case 'ngay': return p2(d);
			case 'thang': return p2(m);
			case 'nam': return String(y);
			case 'thu': return THU[when.getDay()];
			case 'gio': return p2(when.getHours()) + ':' + p2(when.getMinutes());
			case 'dmy': return p2(d) + '.' + p2(m) + '.' + y;
			case 'dai': return THU[when.getDay()] + ', ngày ' + d + ' tháng ' + m + ' năm ' + y;
			case 'am':
				var l = lunar(d, m, y);
				return 'Nhằm ngày ' + l[0] + ' tháng ' + l[1] + (l[3] ? ' nhuận' : '') + ' năm ' + CAN[l[2] % 10] + ' ' + CHI[l[2] % 12] + ' (âm lịch)';
		}
		return '';
	}

	/* ---------- Điền dữ liệu ---------- */
	function fill(root) {
		root.querySelectorAll('[data-k]').forEach(function (el) {
			var k = el.getAttribute('data-k');
			if (LON && k === 'loiMoi' && D.loiMoiLon) k = 'loiMoiLon';
			var v = get(k); if (v != null) el.textContent = v;
		});
		if (LON) {
			root.querySelectorAll('[data-lon]').forEach(function (el) { el.textContent = el.getAttribute('data-lon'); });
			root.querySelectorAll('[data-lon-ph]').forEach(function (el) { el.placeholder = el.getAttribute('data-lon-ph'); });
		}
		root.querySelectorAll('[data-k-src]').forEach(function (el) { var v = get(el.getAttribute('data-k-src')); if (v) el.src = v; });
		root.querySelectorAll('[data-k-bg]').forEach(function (el) { var v = get(el.getAttribute('data-k-bg')); if (v) el.style.backgroundImage = 'url("' + v + '")'; });
		root.querySelectorAll('[data-k-href]').forEach(function (el) { var v = get(el.getAttribute('data-k-href')); if (v) el.href = v; else el.hidden = true; });
		root.querySelectorAll('[data-date]').forEach(function (el) { el.textContent = fmt(el.getAttribute('data-date')); });
		root.querySelectorAll('[data-khach]').forEach(function (el) { el.textContent = khach || el.getAttribute('data-khach') || 'Bạn'; });
	}

	// Mỗi phần tử sinh ra được đánh dấu data-gen (để vẽ lại khi sửa), ô chữ được đánh dấu data-li = vị trí.
	function renderList(box, shown) {
		var tpl = box.querySelector('template'), key = box.getAttribute('data-list'), arr = get(key) || [];
		if (!tpl) return;
		box.querySelectorAll('[data-gen]').forEach(function (n) { n.remove(); });
		arr.forEach(function (item, i) {
			var node = tpl.content.cloneNode(true);
			node.querySelectorAll('[data-i]').forEach(function (el) { el.textContent = item[el.getAttribute('data-i')] || ''; el.setAttribute('data-li', i); });
			node.querySelectorAll('[data-n]').forEach(function (el) { el.textContent = p2(i + 1); });
			[].forEach.call(node.children, function (el) { el.setAttribute('data-gen', i); el.style.setProperty('--i', i); if (shown) { el.classList.add('in'); el.querySelectorAll('.rv').forEach(function (r) { r.classList.add('in'); }); } });
			box.appendChild(node);
		});
	}
	function renderAlbum(box, shown) {
		var cls = box.getAttribute('data-album') || '';
		box.querySelectorAll('.ky-photo').forEach(function (n) { n.remove(); });
		(D.album || []).forEach(function (src, i) {
			var a = document.createElement('a');
			a.href = src;
			a.className = 'ky-photo ' + cls + (shown ? ' in' : '');
			a.setAttribute('data-ai', i);
			a.style.setProperty('--i', i);
			a.innerHTML = '<img loading="lazy" decoding="async" alt="">';
			a.firstChild.src = src;
			box.appendChild(a);
		});
	}
	function lists(shown) {
		document.querySelectorAll('[data-list]').forEach(function (b) { renderList(b, shown); });
		document.querySelectorAll('[data-album]').forEach(function (b) { renderAlbum(b, shown); });
	}

	/* ---------- Đếm ngược ---------- */
	function countdown() {
		var el = { d: document.querySelectorAll('[data-cd-d]'), h: document.querySelectorAll('[data-cd-h]'), m: document.querySelectorAll('[data-cd-m]'), s: document.querySelectorAll('[data-cd-s]') };
		if (!when || !el.d.length) return;
		function set(list, v) { list.forEach(function (x) { x.textContent = p2(v); }); }
		function tick() {
			var diff = Math.max(0, when - Date.now());
			set(el.d, Math.floor(diff / 864e5)); set(el.h, Math.floor(diff % 864e5 / 36e5));
			set(el.m, Math.floor(diff % 36e5 / 6e4)); set(el.s, Math.floor(diff % 6e4 / 1e3));
			if (!diff) document.documentElement.classList.add('ky-today');
		}
		tick(); setInterval(tick, 1000);
	}

	/* ---------- Hiệu ứng ---------- */
	function reveal() {
		var els = document.querySelectorAll('.rv');
		if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
		var io = new IntersectionObserver(function (es) {
			es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
		}, { threshold: 0.14 });
		els.forEach(function (e) { io.observe(e); });
	}

	var audio = null, musicBtn = null;
	function setMusic(url) {
		if (audio) { audio.pause(); audio = null; }
		if (!musicBtn) return;
		musicBtn.classList.remove('on');
		musicBtn.hidden = !url;
		if (!url) return;
		audio = new Audio(url);
		audio.loop = true;
		audio.addEventListener('play', function () { musicBtn.classList.add('on'); });
		audio.addEventListener('pause', function () { musicBtn.classList.remove('on'); });
	}
	function music() {
		musicBtn = document.querySelector('[data-music]');
		if (!musicBtn) return;
		musicBtn.addEventListener('click', function () { if (audio) audio.paused ? audio.play().catch(function () {}) : audio.pause(); });
		setMusic(D.nhacNen);
	}

	function intro() {
		var el = document.querySelector('.ky-intro');
		if (!el) return;
		document.documentElement.classList.add('ky-lock');
		var opened = false;
		function open() {
			if (opened) return;
			opened = true;
			el.classList.add('open');
			document.documentElement.classList.remove('ky-lock');
			document.dispatchEvent(new Event('ky:open'));
			if (audio) audio.play().catch(function () {});
			setTimeout(function () { el.classList.add('done'); document.dispatchEvent(new Event('ky:opened')); }, 1200);
		}
		el.addEventListener('click', open);
		el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
	}

	function lightbox() {
		var lb = document.createElement('div');
		lb.className = 'ky-lb';
		lb.innerHTML = '<button type="button" aria-label="Đóng">×</button><img alt="">';
		document.body.appendChild(lb);
		document.addEventListener('click', function (e) {
			var a = e.target.closest('.ky-photo');
			if (a) { e.preventDefault(); lb.querySelector('img').src = a.href; lb.classList.add('open'); return; }
			if (e.target.closest('.ky-lb')) lb.classList.remove('open');
		});
	}

	// Nút mời khách tự tạo thiệp (dưới dòng "Tạo Thiệp Tại Kỷ Yếu TNT MEDIA"); không hiện khi chủ thiệp đang sửa trong app.
	// Pháo giấy (canvas, tự xoá sau ~5s). Dùng chung cho popup voucher.
	function phaoGiay(n) {
		if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		var c = document.createElement('canvas'), x = c.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1);
		c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483646';
		document.body.appendChild(c);
		var W = c.width = innerWidth * dpr, H = c.height = innerHeight * dpr, ps = [], cols = ['#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#fde047'];
		for (var i = 0; i < (n || 150); i++) { var s = i % 2; ps.push({ x: s ? W * 0.96 : W * 0.04, y: H * 0.8, vx: (s ? -1 : 1) * (5 + Math.random() * 11) * dpr, vy: -(13 + Math.random() * 13) * dpr, w: (5 + Math.random() * 6) * dpr, h: (8 + Math.random() * 8) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[i % cols.length] }); }
		var t0 = performance.now();
		(function f(t) {
			x.clearRect(0, 0, W, H); var con = 0;
			ps.forEach(function (p) { p.vy += 0.42 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr; if (p.y < H + 40) con++; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 1.3))); x.restore(); });
			if (con && t - t0 < 5500) requestAnimationFrame(f); else c.remove();
		})(t0);
	}

	// Popup "voucher kỷ yếu 10%" cho khách xem thiệp (15–20s sau khi mở thiệp). Không hiện khi chủ thiệp xem/sửa.
	// Bỏ qua -> 3 ngày sau mới hiện lại; đã nhận -> không hiện nữa.
	function form() {
		document.querySelectorAll('form[data-ky-form]').forEach(function (f) {
			var msg = f.querySelector('.ky-msg');
			var nameIn = f.querySelector('[name="ten"]');
			if (nameIn && khach) nameIn.value = khach;
			f.addEventListener('submit', function (e) {
				e.preventDefault();
				var data = Object.fromEntries(new FormData(f));
				if (!String(data.ten || '').trim()) { msg.textContent = 'Bạn nhập tên giúp tớ nhé!'; return; }
				var done = function () {
					msg.textContent = 'Cảm ơn ' + data.ten.trim() + '! Lời chúc đã được gửi tới ' + (D.tenGoi || 'bạn ấy') + ' 💌';
					f.classList.add('sent');
					f.reset();
				};
				// Hệ thống thật gắn window.KY_SUBMIT(data) trả về Promise; bản xem thử chỉ báo đã gửi.
				if (typeof window.KY_SUBMIT === 'function') {
					msg.textContent = 'Đang gửi...';
					Promise.resolve(window.KY_SUBMIT(data)).then(done, function (err) { msg.textContent = (err && err.message) || 'Chưa gửi được, bạn thử lại nhé.'; });
				} else {
					done();
				}
			});
		});
	}

	function actions() {
		document.querySelectorAll('[data-share]').forEach(function (b) {
			b.addEventListener('click', function () {
				var d = { title: document.title, url: location.href };
				if (navigator.share) navigator.share(d).catch(function () {});
				else if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { var t = b.textContent; b.textContent = 'Đã sao chép link!'; setTimeout(function () { b.textContent = t; }, 1600); });
			});
		});
		calLinks();
	}
	function calLinks() {
		if (!when) return;
		var end = new Date(when.getTime() + 4 * 36e5);
		var z = function (x) { return x.getFullYear() + p2(x.getMonth() + 1) + p2(x.getDate()) + 'T' + p2(x.getHours()) + p2(x.getMinutes()) + '00'; };
		var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent((D.suKien.ten || 'Kỷ yếu') + ' ' + (D.lop || '')) + '&dates=' + z(when) + '/' + z(end) + '&ctz=Asia/Ho_Chi_Minh&location=' + encodeURIComponent([D.suKien.diaDiem, D.suKien.diaChi].filter(Boolean).join(', '));
		document.querySelectorAll('[data-cal]').forEach(function (a) { a.href = url; a.target = '_blank'; a.rel = 'noopener'; });
	}

	// Gọi lại sau khi sửa dữ liệu (edit.js): tính lại ngày, âm lịch, đếm ngược, link lịch, link bản đồ.
	function refresh() {
		parseWhen();
		document.documentElement.classList.remove('ky-today');
		document.querySelectorAll('[data-date]').forEach(function (el) { el.textContent = fmt(el.getAttribute('data-date')); });
		document.querySelectorAll('[data-k-href]').forEach(function (el) { var v = get(el.getAttribute('data-k-href')); if (v) { el.href = v; el.hidden = false; } else el.hidden = true; });
		calLinks();
		document.title = 'Thiệp mời kỷ yếu – ' + (D.hoTen || '') + ' ' + (D.lop || '');
		document.dispatchEvent(new Event('ky:refresh'));
	}

	function init() {
		document.title = 'Thiệp mời kỷ yếu – ' + (D.hoTen || '') + ' ' + (D.lop || '');
		lists();
		fill(document);
		countdown();
		music();
		intro();
		reveal();
		lightbox();
		form();
		actions();
		document.documentElement.classList.add('ky-js');
	}
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
	window.KY = { data: D, fmt: fmt, get: get, refresh: refresh, renderList: renderList, renderAlbum: renderAlbum, lunar: lunar, setMusic: setMusic };
})();
