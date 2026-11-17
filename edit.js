
(function () {
	'use strict';
	var STORE = 'ky-thiep-sua-v1';
	var q = new URLSearchParams(location.search);
	// Chạy trong app tạo thiệp (window.KY_HOST): dữ liệu lấy/lưu ở máy chủ, không dùng localStorage.
	var HOST = window.KY_HOST || null;
	var saved = {};
	if (!HOST) {
		try { saved = JSON.parse(localStorage.getItem(STORE) || '{}') || {}; } catch (e) { saved = {}; }
		// Dữ liệu đã sửa đè lên dữ liệu mẫu trước khi ky.js đọc.
		if (Object.keys(saved).length) window.KY_DEMO = Object.assign({}, window.KY_DEMO || {}, saved);
	}

	var allow = window.KY_EDIT != null ? !!window.KY_EDIT : (q.has('sua') || !q.has('khach'));
	if (!allow) return;

	var html = document.documentElement, editing = false, dirty = Object.assign({}, saved), D, picker, pickCb;
	var PLAIN = (function () { var d = document.createElement('div'); d.contentEditable = 'plaintext-only'; return d.contentEditable === 'plaintext-only'; })();

	var FIELDS = [
		['hoTen', 'Họ và tên'], ['tenGoi', 'Tên gọi thân mật (ký tên)'], ['lop', 'Lớp'], ['truong', 'Trường'], ['nienKhoa', 'Niên khoá'],
		['suKien.ten', 'Tên sự kiện'], ['suKien.ngayGio', 'Ngày giờ', 'datetime-local'], ['suKien.diaDiem', 'Địa điểm'], ['suKien.diaChi', 'Địa chỉ'],
		['suKien.banDo', 'Link Google Maps', 'url'], ['trangPhuc', 'Trang phục'], ['loiMoi', 'Lời mời (bạn bè)', 'area'], ['loiMoiLon', 'Lời mời người lớn (gia đình, thầy cô)', 'area'], ['loiNhan', 'Lời nhắn / câu trích', 'area'],
		['nhacNen', 'Link nhạc nền (.mp3)', 'url']
	];

	/* ---------- Dữ liệu ---------- */
	function get(path) { return path.split('.').reduce(function (o, k) { return o == null ? o : o[k]; }, D); }
	function setv(path, v) {
		var ks = path.split('.'), o = D;
		for (var i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; }
		o[ks[ks.length - 1]] = v;
		mark(ks[0]);
	}
	var tSave, tRef;
	function mark(top) {
		dirty[top] = JSON.parse(JSON.stringify(D[top]));
		clearTimeout(tSave);
		tSave = setTimeout(persist, 400);
		clearTimeout(tRef);
		tRef = setTimeout(function () { if (window.KY && KY.refresh) KY.refresh(); }, 250);
	}
	var saving = null, again = false;
	function persist() {
		if (!HOST) {
			try { localStorage.setItem(STORE, JSON.stringify(dirty)); flash('Đã lưu ✓'); }
			catch (e) { toast('Bộ nhớ trình duyệt đã đầy (ảnh quá nhiều/quá lớn). Hãy bớt ảnh hoặc bấm "Xuất dữ liệu".'); }
		}
		if (typeof window.KY_SAVE !== 'function') return;
		// Lưu tuần tự: đang gửi thì đợi xong rồi gửi bản mới nhất.
		if (saving) { again = true; return saving; }
		flash('Đang lưu…');
		saving = Promise.resolve().then(function () { return window.KY_SAVE(dirty, D); }).then(function () {
			if (HOST) flash('Đã lưu ✓');
		}, function (err) {
			toast((err && err.message) || 'Chưa lưu lên máy chủ được, thử lại sau.');
		}).then(function () {
			saving = null;
			if (again) { again = false; persist(); }
		});
		return saving;
	}
	// Ảnh: thu nhỏ rồi (nếu chạy trong app) tải lên máy chủ, trả về đường dẫn ảnh.
	function imageUrl(file) {
		return shrink(file).then(function (src) {
			if (typeof window.KY_UPLOAD !== 'function') return src;
			return fetch(src).then(function (r) { return r.blob(); }).then(window.KY_UPLOAD);
		});
	}

	/* ---------- Giao diện ---------- */
	var css = '' +
		'[data-ml]{white-space:pre-line}' +
		'.ky-ed-fab{position:fixed;left:max(14px,calc(50vw - 226px));bottom:18px;z-index:1500;display:flex;align-items:center;gap:6px;padding:11px 16px;border:0;border-radius:30px;background:#2b2140;color:#fff;font:700 14px/1 system-ui,sans-serif;box-shadow:0 10px 24px -8px rgba(43,33,64,.6);cursor:pointer;animation:kyEdIn .6s cubic-bezier(.3,1.5,.5,1) 1s both}' +
		'.ky-ed-fab::after{content:"";position:absolute;inset:-4px;border-radius:inherit;border:2px solid #f9a8d4;animation:kyEdRing 2s ease-out infinite}' +
		'@keyframes kyEdIn{from{opacity:0;transform:translateY(30px) scale(.6)}}@keyframes kyEdRing{from{opacity:.9}to{opacity:0;transform:scale(1.3)}}' +
		'.ky-ed-bar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:1500;display:flex;gap:6px;padding:7px;max-width:calc(100vw - 16px);overflow-x:auto;background:rgba(36,28,54,.94);backdrop-filter:blur(8px);border-radius:18px;box-shadow:0 14px 30px -10px rgba(0,0,0,.5);font:600 13px/1 system-ui,sans-serif;animation:kyEdUp .4s ease both;scrollbar-width:none}' +
		'.ky-ed-bar[hidden]{display:none}' +
		'@keyframes kyEdUp{from{opacity:0;transform:translate(-50%,40px)}}' +
		'.ky-ed-bar button{flex:none;padding:10px 12px;border:0;border-radius:12px;background:rgba(255,255,255,.1);color:#fff;font:inherit;cursor:pointer;white-space:nowrap}' +
		'.ky-ed-bar button.pri{background:#f472b6;color:#2b2140;font-weight:800}' +
		'.ky-ed-tip{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:1500;width:max-content;max-width:calc(100vw - 20px);padding:9px 14px;border-radius:14px;background:rgba(36,28,54,.94);color:#fff;font:600 12.5px/1.4 system-ui,sans-serif;text-align:center;box-shadow:0 10px 24px -10px rgba(0,0,0,.5);transition:opacity .4s,transform .4s}' +
		'.ky-ed-tip.hide{opacity:0;transform:translate(-50%,-20px);pointer-events:none}' +
		'.ky-ed-tip b{color:#f9a8d4}' +
		'.ky-ed-saved{position:fixed;right:max(14px,calc(50vw - 226px));top:12px;z-index:1501;padding:6px 12px;border-radius:20px;background:#10b981;color:#fff;font:700 12px system-ui,sans-serif;opacity:0;transition:opacity .3s;pointer-events:none}' +
		'.ky-ed-saved.on{opacity:1}' +
		'.ky-editing body{padding-bottom:84px}' +
		'.ky-editing .rv,.ky-editing [data-split] .fx-ch{opacity:1!important;transform:none!important;filter:none!important;transition:none!important}' +
		'.ky-editing .fx-tilt{transform:none!important}.ky-editing .fx-glare,.ky-editing .fx-canvas,.ky-editing .fx-scratch-c,.ky-editing .fx-scratch-hint,.ky-editing .ky-music,.ky-editing .ky-ed-fab{display:none!important}' +
		'.ky-editing [contenteditable]{outline:1.5px dashed rgba(236,72,153,.85);outline-offset:3px;border-radius:3px;cursor:text;min-width:1.5ch;-webkit-user-select:text;user-select:text}' +
		'.ky-editing [contenteditable]:hover{background:rgba(249,168,212,.18)}' +
		'.ky-editing [contenteditable]:focus{outline:2px solid #ec4899;background:rgba(255,255,255,.45);box-shadow:0 0 0 6px rgba(236,72,153,.15)}' +
		'.ky-editing [contenteditable]:empty::before{content:"Nhập…";opacity:.45}' +
		'.ky-editing [data-date]{outline:1.5px dashed rgba(59,130,246,.9);outline-offset:3px;border-radius:3px;cursor:pointer}' +
		'.ky-editing [data-khach]{outline:1.5px dotted rgba(120,120,140,.7);outline-offset:3px;cursor:help}' +
		'.ky-editing img[data-k-src],.ky-editing [data-k-bg],.ky-editing .ky-photo{outline:2.5px dashed rgba(236,72,153,.9);outline-offset:-5px;cursor:pointer}' +
		'.ky-ed-img{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:30;padding:7px 12px;border-radius:20px;background:rgba(36,28,54,.82);color:#fff;font:700 12px system-ui,sans-serif;white-space:nowrap;pointer-events:none}' +
		'.ky-ed-x{position:absolute;top:6px;right:6px;z-index:31;width:28px;height:28px;border:2px solid #fff;border-radius:50%;background:#e11d48;color:#fff;font:700 16px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 10px rgba(0,0,0,.3)}' +
		'.ky-ed-add{display:block;margin:12px auto 0;padding:9px 18px;border:2px dashed #ec4899;border-radius:14px;background:rgba(255,255,255,.75);color:#9d174d;font:700 13px system-ui,sans-serif;cursor:pointer}' +
		'.ky-ed-dlg{position:fixed;inset:0;z-index:2100;display:flex;align-items:flex-end;justify-content:center;background:rgba(20,14,30,.5);animation:kyEdFade .25s ease}' +
		'@keyframes kyEdFade{from{opacity:0}}' +
		'.ky-ed-dlg form{width:min(480px,100%);max-height:88vh;overflow:auto;padding:18px 18px 20px;border-radius:22px 22px 0 0;background:#fff;color:#2b2140;font:500 14px/1.4 system-ui,sans-serif;animation:kyEdUp2 .35s cubic-bezier(.2,.8,.3,1)}' +
		'@keyframes kyEdUp2{from{transform:translateY(60%)}}' +
		'.ky-ed-dlg h3{font:800 17px system-ui,sans-serif;margin-bottom:12px}' +
		'.ky-ed-dlg label{display:block;margin-bottom:10px;font-weight:700;font-size:12.5px;color:#6b5f80}' +
		'.ky-ed-dlg input,.ky-ed-dlg textarea{display:block;width:100%;margin-top:4px;padding:10px 12px;border:1.5px solid #e2d9ef;border-radius:12px;font:500 15px system-ui,sans-serif;color:#2b2140;background:#faf7ff}' +
		'.ky-ed-dlg input:focus,.ky-ed-dlg textarea:focus{outline:none;border-color:#ec4899;background:#fff}' +
		'.ky-ed-dlg .row{display:flex;gap:8px;margin-top:14px}.ky-ed-dlg .row button{flex:1;padding:12px;border:0;border-radius:12px;font:700 14px system-ui,sans-serif;cursor:pointer;background:#f1ecf8;color:#2b2140}.ky-ed-dlg .row button.pri{background:#ec4899;color:#fff}' +
		'.ky-ed-music{display:flex;flex-direction:column;gap:6px;max-height:52vh;overflow:auto}' +
		'.ky-ed-music .mrow{display:flex;align-items:center;gap:10px;margin:0;padding:10px 12px;border-radius:12px;background:#faf7ff;color:#2b2140;font-size:14px;cursor:pointer}' +
		'.ky-ed-music .mrow input{display:inline;width:18px;height:18px;margin:0;accent-color:#ec4899}' +
		'.ky-ed-music .mrow span{flex:1}' +
		'.ky-ed-music .mplay{width:34px;height:34px;border:0;border-radius:50%;background:#ec4899;color:#fff;cursor:pointer;font-size:12px}' +
		'.ky-ed-toast{position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:2200;width:max-content;max-width:calc(100vw - 30px);padding:10px 16px;border-radius:14px;background:#2b2140;color:#fff;font:600 13px/1.4 system-ui,sans-serif;text-align:center;animation:kyEdFade .25s ease}';

	function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
	var fab, bar, tip, savedBadge;
	function toast(msg) {
		var t = el('div', 'ky-ed-toast', msg);
		document.body.appendChild(t);
		setTimeout(function () { t.remove(); }, 3200);
	}
	var tFlash;
	function flash(txt) { if (!savedBadge) return; savedBadge.textContent = txt || 'Đã lưu ✓'; savedBadge.classList.add('on'); clearTimeout(tFlash); tFlash = setTimeout(function () { savedBadge.classList.remove('on'); }, 1200); }

	/* ---------- Ô chữ ---------- */
	function editableNodes() { return document.querySelectorAll('[data-k],[data-li]'); }
	function makeEditable(n) {
		if (n.closest('.ky-intro,title,script,template') || n.closest('.ky-ed-bar')) return;
		n.contentEditable = PLAIN ? 'plaintext-only' : 'true';
		n.spellcheck = false;
	}
	function onInput(e) {
		if (!editing) return;
		var n = e.target.closest ? e.target.closest('[contenteditable]') : null;
		if (!n) return;
		var v = n.textContent;
		if (n.hasAttribute('data-k')) {
			var k = n.getAttribute('data-k');
			setv(k, v);
			document.querySelectorAll('[data-k="' + k + '"]').forEach(function (o) { if (o !== n) o.textContent = v; });
		} else if (n.hasAttribute('data-li')) {
			var box = n.closest('[data-list]'), lk = box.getAttribute('data-list'), i = +n.getAttribute('data-li'), f = n.getAttribute('data-i'), arr = get(lk);
			if (!arr || !arr[i]) return;
			arr[i][f] = v;
			mark(lk.split('.')[0]);
			document.querySelectorAll('[data-list="' + lk + '"] [data-li="' + i + '"][data-i="' + f + '"]').forEach(function (o) { if (o !== n) o.textContent = v; });
		}
	}
	function onKey(e) {
		if (!editing || !e.target.isContentEditable) return;
		// Lời mời / lời nhắn (data-ml) được xuống dòng; các ô khác Enter = xong.
		if (e.key === 'Enter' && !e.target.hasAttribute('data-ml')) { e.preventDefault(); e.target.blur(); }
		if (e.key === 'Escape') e.target.blur();
	}
	function onPaste(e) {
		if (!editing || !e.target.isContentEditable || PLAIN) return;
		e.preventDefault();
		document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text'));
	}

	/* ---------- Ảnh ---------- */
	function pick(multi, cb) {
		if (!picker) { picker = el('input'); picker.type = 'file'; picker.accept = 'image/*'; picker.hidden = true; document.body.appendChild(picker); picker.addEventListener('change', function () { var fs = [].slice.call(picker.files || []); picker.value = ''; if (fs.length && pickCb) pickCb(fs); }); }
		picker.multiple = !!multi;
		pickCb = cb;
		picker.click();
	}
	// Thu nhỏ ảnh về tối đa 1400px, JPEG ~85% để bộ nhớ trình duyệt đủ chỗ.
	// Ảnh PNG/WebP có nền trong suốt (ảnh đã tách nền) thì giữ PNG để không mất phần trong suốt.
	function transparent(c) {
		var d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
		for (var i = 3; i < d.length; i += 4 * 7) if (d[i] < 250) return true;
		return false;
	}
	function shrink(file) {
		return new Promise(function (res, rej) {
			var url = URL.createObjectURL(file), im = new Image(), alpha = /png|webp|gif/.test(file.type || '');
			im.onload = function () {
				var max = alpha ? 1200 : 1400, k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
				c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
				c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
				URL.revokeObjectURL(url);
				if (alpha && transparent(c)) {
					var png = c.toDataURL('image/png');
					// Máy chủ nhận PNG tối đa 4MB: quá lớn thì thu nhỏ thêm.
					for (var s = .8; png.length * .75 > 3.8 * 1048576 && s > .3; s -= .15) {
						var c2 = document.createElement('canvas');
						c2.width = Math.round(c.width * s); c2.height = Math.round(c.height * s);
						c2.getContext('2d').drawImage(c, 0, 0, c2.width, c2.height);
						png = c2.toDataURL('image/png');
					}
					return res(png);
				}
				res(c.toDataURL('image/jpeg', .85));
			};
			im.onerror = function () { URL.revokeObjectURL(url); rej(); };
			im.src = url;
		});
	}
	function imgErr(err) { toast((err && err.message) || 'Không đọc được ảnh này.'); }
	function setImage(k, src) {
		setv(k, src);
		document.querySelectorAll('img[data-k-src="' + k + '"]').forEach(function (i) { i.src = src; });
		document.querySelectorAll('[data-k-bg="' + k + '"]').forEach(function (b) { b.style.backgroundImage = 'url("' + src + '")'; });
	}
	function relative(p) { if (getComputedStyle(p).position === 'static') { p.style.position = 'relative'; p.setAttribute('data-ed-pos', ''); } }
	function badge(host, txt) { relative(host); var b = el('span', 'ky-ed-img ky-ed-tmp', txt); host.appendChild(b); }
	function delBtn(host, fn) { relative(host); var b = el('button', 'ky-ed-x ky-ed-tmp', '×'); b.type = 'button'; b.title = 'Xoá'; b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); fn(); }); host.appendChild(b); }

	function decorate() {
		undecorate();
		editableNodes().forEach(makeEditable);
		document.querySelectorAll('img[data-k-src]').forEach(function (i) { if (!i.closest('.ky-intro')) badge(i.parentElement, '📷 Đổi ảnh'); });
		document.querySelectorAll('[data-k-bg]').forEach(function (b) { if (!b.closest('.ky-intro')) badge(b, '📷 Đổi ảnh'); });
		// Khối album phụ (data-noed: dải phim, slideshow...) dùng chung ảnh với khối chính nên không gắn nút sửa.
		document.querySelectorAll('[data-album]:not([data-noed])').forEach(function (box) {
			box.querySelectorAll('.ky-photo').forEach(function (a) {
				var i = +a.getAttribute('data-ai');
				delBtn(a, function () { D.album.splice(i, 1); mark('album'); rerenderAlbums(); });
			});
			var add = el('button', 'ky-ed-add ky-ed-tmp', '＋ Thêm ảnh vào album');
			add.type = 'button';
			add.addEventListener('click', function () {
				pick(true, function (fs) {
					toast('Đang tải ' + fs.length + ' ảnh…'); Promise.all(fs.map(imageUrl)).then(function (srcs) { D.album = (D.album || []).concat(srcs); mark('album'); rerenderAlbums(); toast('Đã thêm ' + srcs.length + ' ảnh'); }, imgErr);
				});
			});
			box.insertAdjacentElement('afterend', add);
		});
		document.querySelectorAll('[data-list]').forEach(function (box) {
			var lk = box.getAttribute('data-list');
			box.querySelectorAll('[data-gen]').forEach(function (row) {
				var i = +row.getAttribute('data-gen');
				delBtn(row, function () { get(lk).splice(i, 1); mark(lk.split('.')[0]); rerenderLists(lk); });
			});
			var add = el('button', 'ky-ed-add ky-ed-tmp', '＋ Thêm dòng');
			add.type = 'button';
			add.addEventListener('click', function () {
				var arr = get(lk);
				if (!arr) { setv(lk, []); arr = get(lk); }
				var tpl = box.querySelector('template'), item = {};
				tpl.content.querySelectorAll('[data-i]').forEach(function (f) { var key = f.getAttribute('data-i'); item[key] = key === 'gio' ? '00:00' : 'Nội dung mới'; });
				arr.push(item);
				mark(lk.split('.')[0]);
				rerenderLists(lk);
			});
			box.insertAdjacentElement('afterend', add);
		});
	}
	function undecorate() {
		document.querySelectorAll('.ky-ed-tmp').forEach(function (n) { n.remove(); });
		document.querySelectorAll('[data-ed-pos]').forEach(function (n) { n.style.position = ''; n.removeAttribute('data-ed-pos'); });
		document.querySelectorAll('[contenteditable]').forEach(function (n) { n.removeAttribute('contenteditable'); });
	}
	function rerenderAlbums() { document.querySelectorAll('[data-album]').forEach(function (b) { KY.renderAlbum(b, true); }); decorate(); }
	function rerenderLists(lk) { document.querySelectorAll('[data-list="' + lk + '"]').forEach(function (b) { KY.renderList(b, true); }); decorate(); }

	function onClick(e) {
		if (!editing) return;
		var t = e.target;
		if (t.closest('.ky-ed-bar,.ky-ed-dlg,.ky-ed-tip,.ky-ed-x,.ky-ed-add')) return;
		var photo = t.closest('[data-album] .ky-photo');
		if (photo) {
			e.preventDefault(); e.stopImmediatePropagation();
			var i = +photo.getAttribute('data-ai');
			pick(false, function (fs) { toast('Đang tải ảnh…'); imageUrl(fs[0]).then(function (src) { D.album[i] = src; mark('album'); rerenderAlbums(); }, imgErr); });
			return;
		}
		var img = t.closest('img[data-k-src]') || t.closest('[data-k-bg]');
		if (!img && t.querySelector) { var inner = t.querySelector(':scope > img[data-k-src]'); if (inner && t.querySelector('.ky-ed-img')) img = inner; }
		if (img) {
			e.preventDefault(); e.stopImmediatePropagation();
			var k = img.getAttribute('data-k-src') || img.getAttribute('data-k-bg');
			pick(false, function (fs) { toast('Đang tải ảnh…'); imageUrl(fs[0]).then(function (src) { setImage(k, src); toast('Đã đổi ảnh ✓'); }, imgErr); });
			return;
		}
		if (t.closest('[data-date]')) { e.preventDefault(); e.stopImmediatePropagation(); dateDialog(); return; }
		if (t.closest('[data-khach]') && !t.isContentEditable) { toast('Tên khách tự đổi theo link gửi đi: thêm ?khach=Tên vào cuối đường dẫn.'); return; }
		// Khi đang sửa: link/nút của thiệp không chạy (tránh mở bản đồ, chia sẻ, gửi form...).
		if (t.closest('a,button')) { e.preventDefault(); e.stopImmediatePropagation(); return; }
		if (t.closest('[contenteditable]')) e.stopImmediatePropagation();
	}

	/* ---------- Hộp thoại ---------- */
	function toLocal(v) { var d = v ? new Date(v) : null; if (!d || isNaN(d)) return ''; var p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }
	function dialog(title, fields, onSave) {
		var wrap = el('div', 'ky-ed-dlg'), f = el('form');
		f.appendChild(el('h3', '', title));
		fields.forEach(function (fd) {
			var lb = el('label', '', fd[1]), inp;
			if (fd[2] === 'area') { inp = el('textarea'); inp.rows = 4; } else { inp = el('input'); inp.type = fd[2] || 'text'; }
			inp.name = fd[0];
			var v = get(fd[0]);
			inp.value = fd[2] === 'datetime-local' ? toLocal(v) : (v == null ? '' : v);
			lb.appendChild(inp);
			f.appendChild(lb);
		});
		var row = el('div', 'row'), cancel = el('button', '', 'Huỷ'), ok = el('button', 'pri', 'Lưu');
		cancel.type = 'button'; ok.type = 'submit';
		row.appendChild(cancel); row.appendChild(ok); f.appendChild(row);
		wrap.appendChild(f);
		function close() { wrap.remove(); }
		cancel.addEventListener('click', close);
		wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
		f.addEventListener('submit', function (e) {
			e.preventDefault();
			fields.forEach(function (fd) {
				var v = f.elements[fd[0]].value;
				if (String(get(fd[0]) == null ? '' : get(fd[0])) === v) return;
				setv(fd[0], v);
				document.querySelectorAll('[data-k="' + fd[0] + '"]').forEach(function (o) { o.textContent = v; });
				if (fd[0] === 'nhacNen') toast('Nhạc nền sẽ áp dụng khi tải lại trang.');
			});
			if (onSave) onSave();
			if (window.KY && KY.refresh) KY.refresh();
			close();
		});
		document.body.appendChild(wrap);
		var first = f.querySelector('input,textarea');
		if (first) setTimeout(function () { first.focus(); }, 60);
	}
	function dateDialog() { dialog('🗓 Ngày giờ tập trung', [['suKien.ngayGio', 'Ngày & giờ', 'datetime-local']], function () { toast('Đã cập nhật ngày, thứ, âm lịch và đếm ngược ✓'); }); }
	function allDialog() { dialog('📋 Toàn bộ thông tin thiệp', FIELDS); }

	/* Chọn nhạc nền từ danh sách có sẵn (window.KY_MUSIC = [{ten, url}]) */
	function musicDialog() {
		var list = window.KY_MUSIC || [], cur = D.nhacNen || '', prev = new Audio(), wrap = el('div', 'ky-ed-dlg'), f = el('form');
		f.appendChild(el('h3', '', '🎵 Chọn nhạc nền'));
		var box = el('div', 'ky-ed-music');
		[{ ten: 'Không dùng nhạc', url: '' }].concat(list).forEach(function (m) {
			var lb = el('label', 'mrow'), r = el('input'), name = el('span', '', m.ten);
			r.type = 'radio'; r.name = 'nhac'; r.value = m.url; r.checked = m.url === cur;
			lb.appendChild(r); lb.appendChild(name);
			if (m.url) {
				var pl = el('button', 'mplay', '▶'); pl.type = 'button';
				pl.addEventListener('click', function (e) {
					e.preventDefault();
					var on = !prev.paused && prev.dataset.u === m.url;
					prev.pause(); box.querySelectorAll('.mplay').forEach(function (b) { b.textContent = '▶'; });
					if (!on) { prev.src = m.url; prev.dataset.u = m.url; prev.play().catch(function () {}); pl.textContent = '❚❚'; }
				});
				lb.appendChild(pl);
			}
			box.appendChild(lb);
		});
		if (!list.length) box.appendChild(el('p', '', 'Chưa có bài nhạc nào.'));
		f.appendChild(box);
		var row = el('div', 'row'), cancel = el('button', '', 'Huỷ'), ok = el('button', 'pri', 'Chọn bài này');
		cancel.type = 'button'; ok.type = 'submit';
		row.appendChild(cancel); row.appendChild(ok); f.appendChild(row);
		wrap.appendChild(f);
		function close() { prev.pause(); wrap.remove(); }
		cancel.addEventListener('click', close);
		wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
		f.addEventListener('submit', function (e) {
			e.preventDefault();
			var c = f.querySelector('input[name=nhac]:checked'), v = c ? c.value : '';
			if (v !== cur) { setv('nhacNen', v); if (window.KY && KY.setMusic) KY.setMusic(v); }
			toast(v ? 'Đã chọn nhạc nền ✓ — khách bấm nút ♪ hoặc mở thiệp là nhạc phát' : 'Đã tắt nhạc nền');
			close();
		});
		document.body.appendChild(wrap);
	}

	function exportData() {
		var txt = '/* Dữ liệu thiệp kỷ yếu — xuất từ trình sửa trực tiếp ' + new Date().toLocaleString('vi-VN') + ' */\nwindow.KY_DATA = ' + JSON.stringify(D, null, '\t') + ';\n';
		var a = el('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/javascript' })); a.download = 'data.js';
		document.body.appendChild(a); a.click(); a.remove();
		toast('Đã tải file data.js — thay vào thư mục thiệp là xong.');
	}
	function reset() {
		if (!confirm('Xoá mọi chỉnh sửa và quay về thông tin mẫu?')) return;
		try { localStorage.removeItem(STORE); } catch (e) {}
		location.href = location.pathname + '?sua=1';
	}

	function openIntro() {
		var intro = document.querySelector('.ky-intro');
		if (intro && !intro.classList.contains('done')) {
			intro.classList.add('open', 'done');
			html.classList.remove('ky-lock');
			document.dispatchEvent(new Event('ky:opened'));
		}
	}
	function enter() {
		editing = true;
		openIntro();
		html.classList.add('ky-editing');
		if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
		decorate();
		bar.hidden = false;
		tip.classList.remove('hide');
		setTimeout(function () { tip.classList.add('hide'); }, 6000);
	}
	function exit() {
		editing = false;
		undecorate();
		html.classList.remove('ky-editing');
		bar.hidden = true;
		tip.classList.add('hide');
		clearTimeout(tSave); persist();
		document.querySelectorAll('.rv').forEach(function (n) { var r = n.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) n.classList.add('in'); });
		toast('Đã lưu! Đây là thiệp khách sẽ thấy 💌');
	}

	function ui() {
		D = window.KY && KY.data;
		if (!D) return;
		var st = el('style'); st.textContent = css; document.head.appendChild(st);
		fab = el('button', 'ky-ed-fab', '✏️ Sửa thiệp'); fab.type = 'button';
		fab.addEventListener('click', enter);
		bar = el('div', 'ky-ed-bar'); bar.hidden = true;
		var tools = HOST
			? [['✓ Xong', exit, 'pri'], ['📋 Thông tin', allDialog], ['🗓 Ngày giờ', dateDialog], ['🎵 Nhạc', musicDialog], ['👁 Xem thiệp', function () { persist(); window.open(HOST.view, '_blank'); }]].concat(HOST.guests ? [['👥 Khách mời', function () { Promise.resolve(persist()).then(function () { location.href = HOST.guests; }); }]] : []).concat([['← Quản lý', function () { Promise.resolve(persist()).then(function () { location.href = HOST.home; }); }]])
			: [['✓ Xong', exit, 'pri'], ['📋 Thông tin', allDialog], ['🗓 Ngày giờ', dateDialog], ['⬇ Xuất dữ liệu', exportData], ['↺ Về mẫu gốc', reset]];
		if (HOST) FIELDS = FIELDS.filter(function (f) { return f[0] !== 'nhacNen'; });
		tools.forEach(function (b) {
			var x = el('button', b[2] || '', b[0]); x.type = 'button'; x.addEventListener('click', b[1]); bar.appendChild(x);
		});
		tip = el('div', 'ky-ed-tip hide'); tip.innerHTML = 'Chạm vào <b>chữ</b> hoặc <b>ảnh</b> có viền nét đứt để sửa · tự động lưu';
		savedBadge = el('div', 'ky-ed-saved', 'Đã lưu ✓');
		document.body.appendChild(fab); document.body.appendChild(bar); document.body.appendChild(tip); document.body.appendChild(savedBadge);
		document.addEventListener('input', onInput);
		document.addEventListener('keydown', onKey);
		document.addEventListener('paste', onPaste);
		// Chữ đã tách từng ký tự để bay vào (fx.js) -> gộp lại khi bắt đầu gõ cho con trỏ chạy mượt.
		document.addEventListener('focusin', function (e) { if (editing && e.target.isContentEditable && e.target.querySelector('.fx-ch')) e.target.textContent = e.target.textContent; });
		document.addEventListener('click', onClick, true);
		if (q.has('sua') || HOST) enter();
	}
	function boot() { setTimeout(ui, 0); }
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
