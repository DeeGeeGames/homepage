const initialize = function () {
	const root = document.querySelector('.console');
	const catalog = document.querySelector('.catalog');
	if (!(root instanceof HTMLElement) || !(catalog instanceof HTMLElement)) return;
	const find = function (selector) {
		const element = root.querySelector(selector);
		if (!(element instanceof HTMLElement)) throw new Error(`Missing console control: ${selector}`);
		return element;
	};
	const art = find('.art');
	const detailArt = find('.detail-art');
	const dialog = find('dialog');
	const launch = find('.launch');
	if (!(art instanceof HTMLImageElement) || !(detailArt instanceof HTMLImageElement)
		|| !(dialog instanceof HTMLDialogElement) || !(launch instanceof HTMLAnchorElement)) return;
	const title = find('h1');
	const status = find('.status');
	const description = find('.description');
	const library = find('.library');
	const count = find('.count');
	const bankLabel = find('.page-label');
	const guide = find('.guide');
	const announcement = find('#selection-status');
	const details = find('.more');
	const close = find('.close');
	const fullscreen = find('.fullscreen');
	const detailTitle = find('#detail-title');
	const detailDescription = find('.detail-description');
	const detailIndex = find('.detail-index');
	const input = find('.input');
	const artNote = find('.artnote');
	const destinations = find('.destinations');
	const gallery = find('.gallery');
	const galleryImage = find('.gallery-image');
	const galleryCaption = find('.gallery-caption');
	const galleryCount = find('.gallery-count');
	const shots = find('.shots');
	const pause = find('.shot-pause');
	if (!(galleryImage instanceof HTMLImageElement)) return;
	const games = Array.from(catalog.querySelectorAll('.game-panel')).map(function (panel) {
		const heading = panel.querySelector('.game-title');
		const image = panel.querySelector('.art img');
		const play = panel.querySelector('.launch');
		const actions = panel.querySelector('.actions');
		const name = heading?.textContent?.trim();
		const state = panel.querySelector('.status')?.textContent?.trim();
		if (!(panel instanceof HTMLElement) || !(heading instanceof HTMLElement) || !heading.id
			|| !(image instanceof HTMLImageElement) || !(play instanceof HTMLAnchorElement)
			|| !(actions instanceof HTMLElement) || !name || !state) throw new Error('Invalid catalog entry');
		return {
			id: heading.id, name, state, image, play, actions,
			accent: panel.dataset.accent || '#c7ff73',
			prototype: panel.dataset.kind === 'prototype',
			description: panel.querySelector('.description')?.textContent?.trim() || '',
			input: [panel.querySelector('.meta > span:not(.status)')?.textContent?.trim(), panel.querySelector('.input-note')?.textContent?.trim()].filter(Boolean).join(' · '),
			artNote: panel.querySelector('figcaption')?.textContent?.trim() || '',
			screenshots: Array.from(panel.querySelectorAll('.screenshots img')).map(function (shot) {
				if (!(shot instanceof HTMLImageElement)) throw new Error('Invalid screenshot');
				return { source: shot.src, caption: shot.alt };
			}),
		};
	});
	if (games.length === 0) return;
	const motion = matchMedia('(prefers-reduced-motion: reduce)');
	let selected = 0;
	let displayed = -1;
	let inputMode = matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';
	let backgroundRevision = 0;
	let outgoing = null;
	let screenshot = 0;
	let screenshotRevision = 0;
	let rotationTimer = null;
	let rotationPaused = false;
	let shotButtons = [];
	const stopRotation = function () {
		clearTimeout(rotationTimer);
		rotationTimer = null;
	};
	const scheduleRotation = function () {
		stopRotation();
		if (rotationPaused || document.hidden || dialog.open || games[selected].screenshots.length < 2) return;
		rotationTimer = setTimeout(function () { showScreenshot(screenshot + 1); }, 6000);
	};
	const showScreenshot = function (index) {
		const images = games[selected].screenshots;
		if (!images.length) return;
		screenshot = (index + images.length) % images.length;
		const shot = images[screenshot];
		const revision = ++screenshotRevision;
		const candidate = new Image();
		candidate.src = shot.source;
		candidate.decode().then(function () {
			if (revision !== screenshotRevision) return;
			galleryImage.src = shot.source;
			galleryImage.alt = shot.caption;
			galleryImage.hidden = false;
			galleryCaption.textContent = shot.caption;
			galleryCount.textContent = `${String(screenshot + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}`;
			shotButtons.forEach(function (button, position) {
				button.classList.toggle('selected', position === screenshot);
				button.setAttribute('aria-pressed', String(position === screenshot));
			});
		}).catch(function () {
			if (revision !== screenshotRevision) return;
			galleryCaption.textContent = 'Screenshot unavailable. Choose another view.';
		});
		scheduleRotation();
	};
	const resetGallery = function (game) {
		stopRotation();
		screenshotRevision += 1;
		screenshot = 0;
		gallery.hidden = game.screenshots.length === 0;
		root.dataset.gallery = String(!gallery.hidden);
		galleryImage.hidden = true;
		galleryCaption.textContent = '';
		galleryCount.textContent = '';
		gallery.setAttribute('aria-label', `${game.name} gameplay screenshots`);
		shotButtons = game.screenshots.map(function (shot, index) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'shot';
			button.setAttribute('aria-label', `Screenshot ${index + 1}: ${shot.caption}`);
			const image = document.createElement('img');
			image.src = shot.source;
			image.alt = '';
			const number = document.createElement('span');
			number.textContent = String(index + 1).padStart(2, '0');
			button.append(image, number);
			button.addEventListener('click', function () { showScreenshot(index); });
			return button;
		});
		shots.replaceChildren(...shotButtons);
		if (!gallery.hidden) showScreenshot(0);
	};
	const tiles = games.map(function (game, index) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'tile';
		button.setAttribute('aria-label', `${game.name}, ${game.state}`);
		const image = document.createElement('img');
		image.src = game.image.src;
		image.alt = '';
		const label = document.createElement('span');
		label.textContent = game.name;
		button.append(image, label);
		button.addEventListener('click', function () { select(index); });
		library.append(button);
		return button;
	});
	const hint = function () {
		guide.textContent = inputMode === 'touch' ? 'TAP A GAME · THEN PLAY'
			: tiles.includes(document.activeElement) ? '← → SELECT · ENTER PLAY' : '← → SELECT · TAB ACTIONS';
	};
	const resetBackground = function () {
		backgroundRevision += 1;
		art.getAnimations().forEach(function (animation) { animation.cancel(); });
		art.style.removeProperty('opacity');
		outgoing?.remove();
		outgoing = null;
	};
	const snapshot = function () {
		if (art.style.opacity === '0' && outgoing) return outgoing;
		art.getAnimations().forEach(function (animation) { animation.finish(); });
		const style = getComputedStyle(art);
		const previous = document.createElement('img');
		previous.src = art.src;
		previous.alt = '';
		previous.className = 'outgoing-art';
		previous.setAttribute('aria-hidden', 'true');
		for (const property of ['top', 'left', 'width', 'height', 'object-fit', 'object-position', 'opacity', 'filter', 'transform', 'transform-origin', 'clip-path', 'mask-image']) {
			previous.style.setProperty(property, style.getPropertyValue(property));
		}
		outgoing?.remove();
		art.after(previous);
		outgoing = previous;
		return previous;
	};
	const background = function (source, previous) {
		const revision = ++backgroundRevision;
		art.getAnimations().forEach(function (animation) { animation.cancel(); });
		art.style.removeProperty('opacity');
		const opacity = getComputedStyle(art).opacity;
		art.src = source;
		if (!previous || motion.matches) { resetBackground(); return; }
		art.style.opacity = '0';
		art.decode().then(function () {
			if (revision !== backgroundRevision) return;
			art.style.removeProperty('opacity');
			art.animate([{ opacity: 0 }, { opacity }], { duration: 360, easing: 'ease-in-out' });
			const exit = previous.animate([{ opacity: getComputedStyle(previous).opacity }, { opacity: 0 }], { duration: 360, easing: 'ease-in-out', fill: 'forwards' });
			exit.onfinish = function () { previous.remove(); if (outgoing === previous) outgoing = null; };
		}).catch(function () {
			// Preserve the last visible image if the selected artwork fails to load.
			if (revision === backgroundRevision) art.style.opacity = '0';
		});
	};
	const render = function () {
		const game = games[selected];
		if (!game) return;
		const changed = displayed !== selected;
		const previous = changed && displayed >= 0 && !motion.matches ? snapshot() : null;
		root.dataset.game = String(selected);
		root.dataset.scene = [2, 3, 4, 5, 6].includes(selected) ? 'screen' : 'world';
		root.style.setProperty('--game-accent', game.accent);
		title.textContent = game.name;
		status.textContent = game.prototype ? 'PLAYABLE PROTOTYPE' : `${game.state} / GAME`;
		description.textContent = game.description;
		if (changed) background(game.image.src, previous);
		launch.href = game.play.href;
		launch.textContent = game.prototype ? '▶ TRY PROTOTYPE ↗' : '▶ PLAY ↗';
		launch.setAttribute('aria-label', game.play.getAttribute('aria-label') || `${game.name}: Play (opens in new tab)`);
		count.textContent = `${String(selected + 1).padStart(2, '0')} / ${String(games.length).padStart(2, '0')}`;
		const bankSize = innerWidth <= 600 ? 2 : games.length;
		const bank = Math.floor(selected / bankSize);
		tiles.forEach(function (button, index) {
			button.hidden = Math.floor(index / bankSize) !== bank;
			button.tabIndex = index === selected ? 0 : -1;
			button.classList.toggle('selected', index === selected);
			button.setAttribute('aria-pressed', String(index === selected));
		});
		bankLabel.textContent = bankSize === games.length ? 'GAMES + PROTOTYPES' : `${game.prototype ? 'PROTOTYPES' : 'GAMES'} · ${bank * bankSize + 1}–${Math.min(games.length, (bank + 1) * bankSize)}`;
		hint();
		if (changed) {
			resetGallery(game);
			detailArt.src = game.image.src;
			detailTitle.textContent = game.name;
			detailIndex.textContent = `GAME DETAILS / ${String(selected + 1).padStart(2, '0')}`;
			detailDescription.textContent = `${game.description} ${game.state}.${game.prototype ? ' Playable work in progress; mechanics and features may change.' : ''}`;
			input.textContent = game.input;
			artNote.textContent = game.artNote;
			destinations.replaceChildren(...Array.from(game.actions.children).map(function (node) { return node.cloneNode(true); }));
			announcement.textContent = `${game.name}, ${game.state}, ${selected + 1} of ${games.length}`;
			if (displayed >= 0 && !motion.matches) find('.stage').animate([{ opacity: .6, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 180 });
		}
		displayed = selected;
	};
	const select = function (index, updateHash = true) {
		if (dialog.open) return;
		const restoreTileFocus = tiles.includes(document.activeElement);
		selected = (index + games.length) % games.length;
		render();
		if (restoreTileFocus) tiles[selected]?.focus({ preventScroll: true });
		if (updateHash) history.replaceState(null, '', `#${games[selected]?.id || 'games'}`);
	};
	const readHash = function () {
		const hash = location.hash.slice(1);
		const index = games.findIndex(function (game) { return game.id === hash; });
		if (dialog.open) dialog.close();
		if (index >= 0) select(index, false);
		else if (hash === 'experiments') select(games.findIndex(function (game) { return game.prototype; }), false);
		else if (['', 'games', 'arcade'].includes(hash)) select(0, false);
	};
	find('.prev').addEventListener('click', function () { select(selected - 1); });
	find('.next').addEventListener('click', function () { select(selected + 1); });
	find('.shot-prev').addEventListener('click', function () { showScreenshot(screenshot - 1); });
	find('.shot-next').addEventListener('click', function () { showScreenshot(screenshot + 1); });
	pause.addEventListener('click', function () {
		rotationPaused = !rotationPaused;
		pause.textContent = rotationPaused ? '▶' : 'Ⅱ';
		pause.setAttribute('aria-label', `${rotationPaused ? 'Resume' : 'Pause'} screenshot rotation`);
		scheduleRotation();
	});
	gallery.addEventListener('keydown', function (event) {
		if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
		if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
		event.preventDefault();
		const index = event.key === 'Home' ? 0 : event.key === 'End' ? games[selected].screenshots.length - 1 : screenshot + (event.key === 'ArrowRight' ? 1 : -1);
		showScreenshot(index);
		if (event.target instanceof Element && event.target.closest('.shots')) shotButtons[screenshot]?.focus({ preventScroll: true });
	});
	details.addEventListener('click', function () { stopRotation(); dialog.showModal(); });
	close.addEventListener('click', function () { dialog.close(); });
	dialog.addEventListener('close', function () { details.focus({ preventScroll: true }); scheduleRotation(); });
	fullscreen.hidden = !document.fullscreenEnabled;
	fullscreen.addEventListener('click', async function () {
		try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); }
		catch { announcement.textContent = 'Fullscreen is unavailable in this browser.'; }
	});
	document.addEventListener('fullscreenchange', function () { fullscreen.textContent = document.fullscreenElement ? 'Exit fullscreen' : 'Fullscreen'; });
	document.addEventListener('keydown', function (event) {
		if (dialog.open || event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
		if (event.target instanceof Element && event.target.closest('.gallery')) return;
		inputMode = 'keyboard'; hint();
		if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
			event.preventDefault();
			const index = event.key === 'Home' ? 0 : event.key === 'End' ? games.length - 1 : selected + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1);
			select(index);
		}
		if (event.key === 'Enter' && tiles.includes(document.activeElement)) { event.preventDefault(); launch.click(); }
	});
	root.addEventListener('focusin', hint);
	let swipe = null;
	root.addEventListener('pointerdown', function (event) {
		if (event.pointerType === 'touch') { inputMode = 'touch'; hint(); }
		if (!event.isPrimary || dialog.open || !(event.target instanceof Element) || event.target.closest('a, button, dialog')) { swipe = null; return; }
		swipe = { id: event.pointerId, x: event.clientX, y: event.clientY, gallery: Boolean(event.target.closest('.gallery')) };
	});
	root.addEventListener('pointerup', function (event) {
		const start = swipe; swipe = null;
		if (!start || start.id !== event.pointerId) return;
		const dx = event.clientX - start.x;
		if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.5) {
			if (start.gallery) showScreenshot(screenshot + (dx < 0 ? 1 : -1));
			else select(selected + (dx < 0 ? 1 : -1));
		}
	});
	root.addEventListener('pointercancel', function () { swipe = null; });
	motion.addEventListener('change', function () { if (motion.matches) { resetBackground(); root.getAnimations({ subtree: true }).forEach(function (animation) { animation.cancel(); }); } });
	window.addEventListener('resize', render);
	window.addEventListener('hashchange', readHash);
	document.addEventListener('visibilitychange', scheduleRotation);
	window.addEventListener('pagehide', function () { stopRotation(); resetBackground(); });
	window.addEventListener('pageshow', scheduleRotation);
	const skip = document.querySelector('.skip');
	skip?.addEventListener('click', function (event) { event.preventDefault(); tiles[selected]?.focus({ preventScroll: true }); });
	catalog.hidden = true;
	catalog.id = 'fallback-catalog';
	root.id = 'games';
	root.hidden = false;
	readHash();
	if (displayed < 0) render();
};
try { initialize(); } catch (error) {
	console.error('Console initialization failed; keeping the catalog available.', error);
	const root = document.querySelector('.console');
	const catalog = document.querySelector('.catalog');
	if (root instanceof HTMLElement) { root.hidden = true; root.id = 'arcade'; }
	if (catalog instanceof HTMLElement) { catalog.hidden = false; catalog.id = 'games'; }
}
