import { GESTURE, clampTurn, releaseStep, releaseVelocity } from './wheel-gesture.js';
import { createGameHost } from './game-host.js';

const initialize = function () {
	const root = document.querySelector('.console');
	const catalog = document.querySelector('.catalog');
	if (!(root instanceof HTMLElement) || !(catalog instanceof HTMLElement)) return;
	const find = function (selector) {
		const node = root.querySelector(selector);
		if (!(node instanceof HTMLElement)) throw new Error(`Missing launcher control: ${selector}`);
		return node;
	};
	const games = Array.from(catalog.querySelectorAll('.game-panel')).map(function (panel) {
		const heading = panel.querySelector('.game-title');
		const image = panel.querySelector('.art img');
		const play = panel.querySelector('.launch');
		const actions = panel.querySelector('.actions');
		if (!(panel instanceof HTMLElement) || !(heading instanceof HTMLElement) || !heading.id || !heading.textContent
			|| !(image instanceof HTMLImageElement) || !(play instanceof HTMLAnchorElement) || !(actions instanceof HTMLElement)) throw new Error('Invalid game catalog');
		const url = new URL(play.href);
		if (url.protocol !== 'https:') throw new Error('Games require HTTPS');
		const screenshots = Array.from(panel.querySelectorAll('.screenshots img')).filter(function (shot) { return shot instanceof HTMLImageElement; });
		return {
			id: heading.id, name: heading.textContent.trim(), image, url: url.href, actions,
			accent: panel.dataset.accent || '#d3ff83',
			status: panel.querySelector('.status')?.textContent?.trim() || '',
			genre: panel.querySelector('.meta > span:not(.status)')?.textContent?.trim() || 'Prototype',
			description: panel.querySelector('.description')?.textContent?.trim() || '',
			input: panel.querySelector('.input-note')?.textContent?.trim() || '',
			artNote: panel.querySelector('figcaption')?.textContent?.trim() || '',
			prototype: panel.dataset.kind === 'prototype',
			shots: screenshots.length ? screenshots : [image],
		};
	});
	if (!games.length) return;
	const wheel = find('.wheel');
	const details = find('.details-modal');
	const detailShot = find('.detail-shot');
	if (!(details instanceof HTMLDialogElement) || !(detailShot instanceof HTMLImageElement)) return;
	const backgrounds = Array.from(root.querySelectorAll('.background-art')).filter(function (image) { return image instanceof HTMLImageElement; });
	let selected = 0;
	let target = 0;
	let angle = 0;
	let cinema = false;
	let blend = 0;
	let layout = 'tv';
	let width = 0;
	let height = 0;
	let discWidth = 0;
	let discHeight = 0;
	let shotIndex = 0;
	let backgroundIndex = 0;
	let backgroundRevision = 0;
	let gesture = null;
	const pointers = new Set();
	const consumedPointers = new Set();
	let releasedPointer = null;
	let lastTime = 0;
	let raf = 0;
	let stopped = false;
	let toastTimer = 0;
	let inputMode = matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';
	let padPrevious = [];
	let padDirection = 0;
	let padRepeatAt = 0;
	let padArmed = false;
	let padChordAt = 0;
	let padChordUsed = false;
	let padId = '';
	let padAvailable = true;
	const mod = function (value, count = games.length) { return ((value % count) + count) % count; };
	const current = function () { return games[selected]; };
	const toast = function (message) {
		const node = find('.toast');
		node.textContent = message;
		node.hidden = false;
		clearTimeout(toastTimer);
		toastTimer = window.setTimeout(function () { node.hidden = true; }, 4500);
	};
	const fullscreen = async function () {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await root.requestFullscreen();
		} catch { toast('Fullscreen is unavailable here. You can continue in this window.'); }
	};
	const resetPad = function () {
		padArmed = false;
		padDirection = 0;
		padChordAt = 0;
		padChordUsed = false;
	};
	const cancelGesture = function () {
		if (!gesture) return;
		const pointerId = gesture.id;
		consumedPointers.add(pointerId);
		gesture = null;
		root.classList.remove('dragging');
		if (wheel.hasPointerCapture(pointerId)) wheel.releasePointerCapture(pointerId);
	};
	const host = createGameHost(root, {
		cancelGesture, fullscreen, ownershipChanged: resetPad,
		exited: function () {
			resetPad();
			document.title = `${current().name} · DeeGee Games`;
			root.classList.remove('hosting');
			find('.play').focus({ preventScroll: true });
			root.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 450 });
		},
	});
	const discs = games.map(function (game, index) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'game-disc';
		const ring = document.createElement('span');
		ring.className = 'disc-ring';
		const face = document.createElement('span');
		face.className = 'disc-face';
		const image = document.createElement('img');
		image.src = game.image.src;
		image.alt = '';
		image.draggable = false;
		const shade = document.createElement('span');
		shade.className = 'disc-shade';
		const number = document.createElement('span');
		number.className = 'disc-number';
		number.textContent = `${String(index + 1).padStart(2, '0')} / DEEGEE`;
		const label = document.createElement('span');
		label.className = 'disc-label';
		label.textContent = game.name;
		face.append(image, shade, number, label);
		button.append(ring, face);
		button.addEventListener('click', function () {
			if (host.active() || details.open) return;
			if (selected === index) launch();
			else select(target + mod(index - selected + games.length / 2) - games.length / 2);
		});
		wheel.append(button);
		const dot = document.createElement('i');
		find('.dots').append(dot);
		return button;
	});
	const changeBackground = function (game) {
		const revision = ++backgroundRevision;
		const image = new Image();
		image.src = game.image.src;
		image.decode().then(function () {
			if (revision !== backgroundRevision || stopped) return;
			backgroundIndex = 1 - backgroundIndex;
			backgrounds.forEach(function (node, index) {
				if (index === backgroundIndex) node.src = image.src;
				node.classList.toggle('visible', index === backgroundIndex);
			});
		}).catch(function () { /* Retain the last successfully decoded artwork. */ });
	};
	const updatePrompts = function (mode) {
		inputMode = mode;
		root.dataset.input = mode;
		root.querySelectorAll('[data-pad]').forEach(function (node) {
			if (node instanceof HTMLElement) node.textContent = mode === 'gamepad' ? node.dataset.pad || '' : node.dataset.key || '';
		});
		find('.input-hint').textContent = mode === 'gamepad' ? 'D-pad / stick Browse · A Play · B Back'
			: mode === 'touch' ? 'Swipe or tap a neighboring game' : '↑ ↓ / ← → Browse · Enter Play';
	};
	const renderSelection = function () {
		const game = current();
		root.style.setProperty('--accent', game.accent);
		find('#selected-title').textContent = game.name;
		find('.genre').textContent = game.genre;
		find('.description').textContent = game.description;
		find('.status').textContent = game.status;
		find('.count').textContent = String(selected + 1).padStart(2, '0');
		find('.total').textContent = String(games.length).padStart(2, '0');
		find('.orbit-core b').textContent = String(games.length).padStart(2, '0');
		Array.from(find('.dots').children).forEach(function (dot, index) { dot.classList.toggle('on', index === selected); });
		discs.forEach(function (disc, index) {
			disc.classList.toggle('selected', index === selected);
			disc.tabIndex = selected === index ? 0 : -1;
			disc.setAttribute('aria-pressed', String(selected === index));
			disc.setAttribute('aria-label', `${games[index].name}, ${games[index].status}${index === selected ? ', selected, play' : ', select'}`);
		});
		document.title = `${game.name} · DeeGee Games`;
		find('#selected-title').animate([{ opacity: 0.3, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 360 });
		changeBackground(game);
	};
	const select = function (next, updateHash = true) {
		if (host.active() || details.open) return;
		cancelGesture();
		const restore = discs.includes(document.activeElement);
		target = next;
		selected = mod(next);
		renderSelection();
		if (restore) discs[selected].focus({ preventScroll: true });
		if (updateHash) history.replaceState(null, '', `#${current().id}`);
	};
	const readHash = function () {
		if (host.active()) { history.replaceState(null, '', `#${current().id}`); return; }
		const hash = location.hash.slice(1);
		const index = games.findIndex(function (game) { return game.id === hash || (hash === 'heavy-rig-title' && game.id === 'iron-wake-title'); });
		if (details.open) details.close();
		if (index >= 0) select(index, false);
		else if (hash === 'experiments' || hash === 'experiments-heading') select(games.findIndex(function (game) { return game.prototype; }), false);
	};
	const showShot = function (offset = 0) {
		const shots = current().shots;
		shotIndex = mod(shotIndex + offset, shots.length);
		const shot = shots[shotIndex];
		detailShot.src = shot.src;
		detailShot.alt = shot.alt;
		find('.shot-caption').textContent = `${shotIndex + 1} / ${shots.length} · ${shot.alt}`;
		find('.shot-prev').hidden = shots.length < 2;
		find('.shot-next').hidden = shots.length < 2;
	};
	const showDetails = function () {
		if (host.active() || details.open) return;
		cancelGesture();
		const game = current();
		find('#detail-title').textContent = game.name;
		find('.detail-description').textContent = game.description;
		find('.detail-status').textContent = `${game.status}${game.prototype ? ' · Playable work in progress; features may change.' : ''}`;
		find('.detail-input').textContent = [game.genre, game.input].filter(Boolean).join(' · ');
		find('.artnote').textContent = game.artNote;
		find('.destinations').replaceChildren(...Array.from(game.actions.querySelectorAll('a')).map(function (link) {
			const clone = link.cloneNode(true);
			if (clone instanceof HTMLAnchorElement) {
				clone.className = '';
				if (link.classList.contains('launch')) clone.textContent = 'Open standalone ↗';
			}
			return clone;
		}));
		shotIndex = 0;
		showShot();
		details.showModal();
		resetPad();
	};
	const closeDetails = function () {
		details.close();
		find('.more').focus({ preventScroll: true });
		resetPad();
	};
	const launch = function () {
		if (host.active()) return;
		if (details.open) details.close();
		const rect = discs[selected].getBoundingClientRect();
		root.classList.add('hosting');
		host.launch(current(), rect);
	};
	const toggleView = function () {
		if (host.active() || details.open) return;
		cancelGesture();
		cinema = !cinema;
		root.classList.toggle('cinema', cinema);
		find('.view-label').textContent = cinema ? 'Wheel view' : 'Cinema view';
		resize();
	};
	const moveFocus = function (dialog, direction) {
		const controls = Array.from(dialog.querySelectorAll('button, a[href]')).filter(function (node) { return node instanceof HTMLElement && !node.hidden && node.getClientRects().length > 0; });
		const index = controls.indexOf(document.activeElement);
		controls[mod(index + direction, controls.length)]?.focus();
	};
	const navigate = function (direction, horizontal = false) {
		const menu = host.menu();
		if (menu) moveFocus(menu, direction);
		else if (host.active()) return;
		else if (details.open) { if (horizontal) showShot(direction); else moveFocus(details, direction); }
		else select(target + direction);
	};
	const activate = function () {
		const active = document.activeElement;
		if (host.menu() || details.open || host.active()) {
			if (active instanceof HTMLElement && active.matches('button, a[href]')) active.click();
		} else if (active instanceof HTMLElement && active.matches('button, a[href]') && root.contains(active)) active.click();
		else launch();
	};
	const back = function () {
		if (host.active()) host.back();
		else if (details.open) closeDetails();
	};
	find('.play').addEventListener('click', launch);
	find('.more').addEventListener('click', showDetails);
	find('.view').addEventListener('click', toggleView);
	find('.previous').addEventListener('click', function () { navigate(-1); });
	find('.next').addEventListener('click', function () { navigate(1); });
	find('.close').addEventListener('click', closeDetails);
	find('.detail-play').addEventListener('click', launch);
	find('.shot-prev').addEventListener('click', function () { showShot(-1); });
	find('.shot-next').addEventListener('click', function () { showShot(1); });
	find('.fullscreen').addEventListener('click', fullscreen);
	find('.fullscreen').hidden = !document.fullscreenEnabled;
	details.addEventListener('cancel', function (event) { event.preventDefault(); closeDetails(); });
	detailShot.addEventListener('error', function () { find('.shot-caption').textContent = 'Screenshot unavailable. Choose another view.'; });
	root.addEventListener('keydown', function (event) {
		if (event.altKey || event.ctrlKey || event.metaKey || (event.target instanceof Element && event.target.matches('input, textarea, select, [contenteditable]'))) return;
		updatePrompts('keyboard');
		const key = event.key.toLowerCase();
		if ((key === 'home' || key === 'end') && !host.active() && !details.open) {
			event.preventDefault();
			select(key === 'home' ? 0 : games.length - 1);
		} else if (key.startsWith('arrow')) {
			if (host.playing()) return;
			event.preventDefault();
			navigate(key === 'arrowleft' || key === 'arrowup' ? -1 : 1, key === 'arrowleft' || key === 'arrowright');
		} else if (key === 'escape' || key === 'backspace') {
			event.preventDefault();
			if (!event.repeat) back();
		} else if (key === 'enter' || key === ' ') {
			// Native buttons/links own activation, including repeats. Never also launch.
			if (event.repeat) { event.preventDefault(); return; }
			if (event.target === root || event.target === wheel) { event.preventDefault(); activate(); }
		} else if (!event.repeat && !host.playing()) {
			if (key === 'x') { event.preventDefault(); showDetails(); }
			if (key === 'y') { event.preventDefault(); toggleView(); }
			if (key === 'f') { event.preventDefault(); fullscreen(); }
		}
	});
	root.addEventListener('pointerdown', function (event) {
		updatePrompts(event.pointerType === 'touch' ? 'touch' : 'pointer');
		pointers.add(event.pointerId);
		consumedPointers.delete(event.pointerId);
		releasedPointer = null;
		if (pointers.size > 1) {
			cancelGesture();
			pointers.forEach(function (id) { consumedPointers.add(id); });
		}
	}, true);
	root.addEventListener('click', function (event) {
		const fromPointer = event instanceof PointerEvent && event.pointerId >= 0 && event.pointerType !== '';
		// Keyboard and gamepad activation must not inherit a pointer's cancellation.
		if (!fromPointer && event.detail === 0) return;
		const id = fromPointer ? event.pointerId : releasedPointer;
		if (consumedPointers.has(id)) {
			consumedPointers.delete(id);
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	}, true);
	wheel.addEventListener('pointerdown', function (event) {
		if (host.active() || details.open || event.button !== 0) return;
		if (pointers.size > 1) return;
		gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, startAngle: angle, axis: '', blocked: false, samples: [{ position: 0, time: performance.now() }], distance: 0, pixels: Math.max(110, discWidth * 0.65) };
	});
	wheel.addEventListener('pointermove', function (event) {
		if (!gesture || event.pointerId !== gesture.id || gesture.blocked) return;
		const dx = event.clientX - gesture.x;
		const dy = event.clientY - gesture.y;
		if (!gesture.axis) {
			if (Math.hypot(dx, dy) < GESTURE.intent) return;
			if (layout === 'phone' && Math.abs(dy) > Math.abs(dx) * 1.15) { gesture.blocked = true; consumedPointers.add(event.pointerId); return; }
			gesture.axis = layout === 'phone' || cinema || Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
			wheel.setPointerCapture(event.pointerId);
			root.classList.add('dragging');
		}
		event.preventDefault();
		const distance = gesture.axis === 'x' ? -dx : dy;
		gesture.distance = distance;
		gesture.samples.push({ position: distance, time: performance.now() });
		gesture.samples = gesture.samples.filter(function (sample) { return performance.now() - sample.time < 150; });
		angle = gesture.startAngle + clampTurn(distance / gesture.pixels);
		draw();
	});
	const release = function (event, cancelled) {
		pointers.delete(event.pointerId);
		releasedPointer = event.pointerId;
		if (!gesture || gesture.id !== event.pointerId) return;
		const held = gesture;
		gesture = null;
		root.classList.remove('dragging');
		if (wheel.hasPointerCapture(event.pointerId)) wheel.releasePointerCapture(event.pointerId);
		if (cancelled || held.axis || held.blocked) consumedPointers.add(event.pointerId);
		if (cancelled || held.blocked || !held.axis) return;
		// Include the release position: a held finger loses velocity instead of
		// inheriting a stale flick. The rendered angle is deliberately untouched.
		const distance = held.axis === 'x' ? -(event.clientX - held.x) : event.clientY - held.y;
		held.samples.push({ position: distance, time: performance.now() });
		const step = releaseStep(distance, releaseVelocity(held.samples, performance.now()), held.pixels);
		if (step) select(target + step);
	};
	window.addEventListener('pointerup', function (event) { release(event, false); });
	window.addEventListener('pointercancel', function (event) { release(event, true); });
	wheel.addEventListener('lostpointercapture', function (event) {
		// Touch implicitly captures the child disc first. Its bubbled loss while
		// transferring capture to the wheel is not a cancellation of our capture.
		if (event.target === wheel && gesture?.id === event.pointerId) cancelGesture();
	});
	const pose = function (index) {
		const a = (mod(index - angle + games.length / 2) - games.length / 2) * Math.PI * 2 / games.length;
		const c = Math.cos(a);
		const s = Math.sin(a);
		const front = Math.max(0, c);
		const phone = layout === 'phone';
		const radius = phone ? Math.min(width * 0.7, height * 0.355) : Math.min(width * (layout === 'tv' ? 0.289 : 0.284), height * 0.62);
		const x = phone ? width / 2 + s * radius : width * (layout === 'tv' ? 0.906 : 0.971) - c * radius;
		const y = phone ? height * 0.046 + c * radius : height / 2 - s * radius;
		const cinemaX = (phone ? width / 2 : layout === 'tv' ? width / 2 : width * 0.72) + s * (phone ? width * 0.64 : width * (layout === 'tv' ? 0.46 : 0.25));
		const cinemaY = (phone ? height * 0.388 : layout === 'tv' ? height * 0.42 : height / 2) + (1 - c) * height * 0.06;
		return { x: x + (cinemaX - x) * blend, y: y + (cinemaY - y) * blend, scale: (0.4 + 0.6 * front ** 3) * (1 - blend) + (0.42 + 0.58 * front) * blend, opacity: front * (0.35 + 0.65 * front), z: Math.round((c + 1) * 100), rotate: -s * 35 * blend, visible: Math.abs(a) < Math.PI / 2 + 0.01 };
	};
	const draw = function () {
		discs.forEach(function (disc, index) {
			const p = pose(index);
			disc.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%) scale(${p.scale}) rotateY(${p.rotate}deg)`;
			disc.style.zIndex = String(p.z);
			disc.style.opacity = String(p.opacity);
			disc.style.pointerEvents = p.visible && p.opacity > 0.05 ? 'auto' : 'none';
		});
	};
	const resize = function () {
		cancelGesture();
		width = root.clientWidth;
		height = root.clientHeight;
		layout = height > width ? 'phone' : height < 540 || width < 1000 ? 'landscape' : 'tv';
		root.dataset.layout = layout;
		discWidth = layout === 'phone' ? Math.min(width * 0.615, height * 0.325, 400) : layout === 'landscape' ? Math.min(width * 0.237, height * 0.515) : Math.min(width * 0.235, height * 0.42);
		discHeight = discWidth;
		if (cinema) {
			discWidth *= layout === 'tv' ? 1.267 : layout === 'landscape' ? 1.22 : 1.117;
			discHeight *= layout === 'tv' ? 0.84 : 0.767;
		}
		root.style.setProperty('--disc-width', `${discWidth}px`);
		root.style.setProperty('--disc-height', `${discHeight}px`);
		draw();
	};
	const gamepad = function (now) {
		if (!padAvailable) return;
		let pad;
		try { pad = Array.from(navigator.getGamepads?.() || []).find(function (candidate) { return candidate?.connected && candidate.mapping === 'standard'; }); }
		catch { padAvailable = false; find('.controller-status').textContent = 'Keyboard / touch'; return; }
		const id = pad ? `${pad.index}:${pad.id}` : '';
		if (id !== padId) { resetPad(); padId = id; find('.controller-status').textContent = pad ? '● Controller connected' : 'Keyboard / controller'; }
		if (!pad) return;
		const pressed = pad.buttons.map(function (button) { return button.pressed; });
		const ax = pad.axes[0] || 0;
		const ay = pad.axes[1] || 0;
		const horizontal = Math.abs(ax) >= Math.abs(ay);
		const axis = horizontal ? ax : ay;
		// Engage at .55, release at .30 to avoid noisy stick repeat.
		const axisDirection = Math.abs(axis) > (padDirection ? 0.30 : 0.55) ? Math.sign(axis) : 0;
		const direction = pressed[14] || pressed[12] ? -1 : pressed[15] || pressed[13] ? 1 : axisDirection;
		const ownsFocus = document.hasFocus() && root.contains(document.activeElement);
		if (!ownsFocus || document.hidden || gesture) { resetPad(); padPrevious = pressed; return; }
		if (!padArmed) {
			padArmed = !pressed.some(Boolean) && Math.abs(ax) < 0.3 && Math.abs(ay) < 0.3;
			padPrevious = pressed;
			return;
		}
		const down = function (index) { return pressed[index] && !padPrevious[index]; };
		if (host.playing()) {
			// Cross-origin games own normal buttons. Only this explicit host chord
			// is observed; games can still see it because Gamepad API is shared.
			if (pressed[8] && pressed[9]) {
				if (!padChordAt) padChordAt = now;
				if (!padChordUsed && now - padChordAt >= 550) { padChordUsed = true; host.openMenu(); updatePrompts('gamepad'); }
			} else { padChordAt = 0; padChordUsed = false; }
			padPrevious = pressed;
			return;
		}
		if (direction && (direction !== padDirection || now >= padRepeatAt)) {
			updatePrompts('gamepad');
			navigate(direction, pressed[14] || pressed[15] || (horizontal && Boolean(axisDirection)));
			padRepeatAt = now + (direction !== padDirection ? 360 : 155);
		}
		padDirection = direction;
		if (down(0)) { updatePrompts('gamepad'); activate(); }
		else if (down(1)) back();
		else if (down(2)) showDetails();
		else if (down(3)) toggleView();
		else if (down(4)) navigate(-1, true);
		else if (down(5)) navigate(1, true);
		else if (down(9) && host.active()) host.back();
		padPrevious = pressed;
	};
	const tick = function (now) {
		if (stopped || document.hidden) return;
		const dt = Math.min(64, now - (lastTime || now));
		lastTime = now;
		gamepad(now);
		if (!gesture) angle += (target - angle) * (1 - Math.exp(-dt / 125));
		blend += ((cinema ? 1 : 0) - blend) * (1 - Math.exp(-dt / 120));
		if (!host.active()) draw();
		raf = requestAnimationFrame(tick);
	};
	const observer = new ResizeObserver(resize);
	const suspend = function () { cancelGesture(); pointers.clear(); resetPad(); cancelAnimationFrame(raf); lastTime = 0; };
	window.addEventListener('blur', function () { cancelGesture(); pointers.clear(); resetPad(); });
	document.addEventListener('visibilitychange', function () {
		if (document.hidden) suspend();
		else if (!stopped) { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); }
	});
	window.addEventListener('pagehide', function () { stopped = true; suspend(); observer.disconnect(); host.teardown(); clearTimeout(toastTimer); });
	window.addEventListener('pageshow', function (event) {
		if (!event.persisted) return;
		stopped = false;
		root.classList.remove('hosting');
		observer.observe(root);
		resize();
		find('.play').focus();
		raf = requestAnimationFrame(tick);
	});
	window.addEventListener('hashchange', readHash);
	find('.clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
	find('.menu-help').textContent = 'Save in the game before leaving. Hold controller View + Menu for the launcher menu. Games can also receive that chord.';
	readHash();
	angle = target;
	renderSelection();
	updatePrompts(inputMode);
	root.hidden = false;
	catalog.hidden = true;
	document.body.classList.add('enhanced');
	observer.observe(root);
	resize();
	raf = requestAnimationFrame(tick);
	root.focus({ preventScroll: true });
};

try { initialize(); } catch (error) { console.error('Launcher unavailable; using the static catalog.', error); }
