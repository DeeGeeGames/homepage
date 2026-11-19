// The games do not currently implement a host messaging protocol. A frame load
// means only that a document loaded: it never establishes readiness, pause or save.
export const createGameHost = function (root, callbacks) {
	const find = function (selector) {
		const node = root.querySelector(selector);
		if (!(node instanceof HTMLElement)) throw new Error(`Missing host control: ${selector}`);
		return node;
	};
	const host = find('.game-host');
	const slot = find('.frame-slot');
	const cover = find('.launch-cover');
	const menu = find('.game-menu');
	const status = find('.load-status');
	const enter = find('.enter-game');
	const menuTitle = find('#menu-title');
	const note = find('.menu-note');
	const exit = find('.exit-game');
	const resume = find('.resume-game');
	const art = find('.launch-art');
	if (!(menu instanceof HTMLDialogElement) || !(art instanceof HTMLImageElement)) throw new Error('Invalid host markup');
	let frame = null;
	let game = null;
	let timeout = 0;
	let revision = 0;
	let confirming = false;
	let entered = false;
	let animation = null;
	const setStatus = function (value, state) {
		status.textContent = value;
		host.dataset.load = state;
	};
	const focusGame = function () {
		if (!frame) return;
		animation?.cancel();
		animation = null;
		entered = true;
		cover.hidden = true;
		frame.focus();
		callbacks.ownershipChanged();
	};
	const resetMenu = function () {
		confirming = false;
		note.textContent = 'The game may continue running while this menu is open.';
		exit.textContent = 'Exit to library';
		resume.textContent = 'Return to game';
		find('.host-fullscreen').hidden = false;
		find('.menu-standalone').hidden = false;
	};
	const closeMenu = function () {
		if (!menu.open) return;
		menu.close();
		resetMenu();
		if (entered) frame?.focus(); else enter.focus();
		callbacks.ownershipChanged();
	};
	const openMenu = function () {
		if (!frame || menu.open) return;
		callbacks.cancelGesture();
		resetMenu();
		menu.showModal();
		resume.focus();
		callbacks.ownershipChanged();
	};
	const teardown = function () {
		revision += 1;
		clearTimeout(timeout);
		timeout = 0;
		animation?.cancel();
		animation = null;
		if (menu.open) menu.close();
		if (frame) {
			frame.onload = null;
			frame.onerror = null;
			// Removing the browsing context unloads its document, audio and workers.
			frame.remove();
			frame = null;
		}
		slot.replaceChildren();
		host.hidden = true;
		game = null;
		entered = false;
	};
	const launch = function (entry, originRect) {
		if (frame) return;
		callbacks.cancelGesture();
		game = entry;
		entered = false;
		const token = ++revision;
		host.hidden = false;
		cover.hidden = false;
		art.src = entry.image.src;
		find('.launch-title').textContent = entry.name;
		find('.host-name').textContent = entry.name;
		menuTitle.textContent = entry.name;
		for (const selector of ['.standalone', '.menu-standalone']) {
			const link = find(selector);
			if (link instanceof HTMLAnchorElement) link.href = entry.url;
		}
		enter.textContent = 'Show game';
		setStatus('Connecting to the game. Its own loading screen will handle assets and saves.', 'loading');
		const candidate = document.createElement('iframe');
		candidate.title = `${entry.name} — game`;
		candidate.allow = 'autoplay; fullscreen; gamepad';
		candidate.allowFullscreen = true;
		candidate.referrerPolicy = 'strict-origin-when-cross-origin';
		candidate.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups allow-popups-to-escape-sandbox');
		candidate.onload = function () {
			if (token !== revision) return;
			clearTimeout(timeout);
			setStatus('Game page loaded. The game may still be loading assets. If it stays blank or shows an error, open it standalone.', 'loaded');
			enter.textContent = 'Enter game';
		};
		candidate.onerror = function () {
			if (token !== revision) return;
			clearTimeout(timeout);
			setStatus('The game page could not be loaded. Try opening it standalone.', 'error');
		};
		candidate.src = entry.url;
		frame = candidate;
		slot.replaceChildren(candidate);
		timeout = window.setTimeout(function () {
			if (token !== revision) return;
			setStatus('This is taking longer than expected. You can show the game, try it standalone, or return to the library. Some connection and embedding errors cannot be detected here.', 'timeout');
		}, 18000);
		if (originRect) {
			const bounds = root.getBoundingClientRect();
			animation = cover.animate([
				{ clipPath: `circle(${originRect.width / 2}px at ${originRect.x - bounds.x + originRect.width / 2}px ${originRect.y - bounds.y + originRect.height / 2}px)`, opacity: 0.7 },
				{ clipPath: `circle(${Math.hypot(bounds.width, bounds.height)}px at 62% 50%)`, opacity: 1 },
			], { duration: 700, easing: 'cubic-bezier(.65,0,.2,1)' });
		}
		enter.focus();
		callbacks.ownershipChanged();
	};
	enter.addEventListener('click', focusGame);
	find('.host-menu-trigger').addEventListener('click', openMenu);
	find('.launch-menu').addEventListener('click', openMenu);
	find('.host-fullscreen').addEventListener('click', function () {
		closeMenu();
		callbacks.fullscreen();
	});
	resume.addEventListener('click', closeMenu);
	exit.addEventListener('click', function () {
		if (!confirming) {
			confirming = true;
			note.textContent = 'Exit this game? Unsaved progress may be lost. The launcher cannot save or verify your progress.';
			exit.textContent = 'Exit game — unsaved progress may be lost';
			resume.textContent = 'Keep playing';
			find('.host-fullscreen').hidden = true;
			find('.menu-standalone').hidden = true;
			resume.focus();
			return;
		}
		teardown();
		callbacks.exited();
	});
	menu.addEventListener('cancel', function (event) { event.preventDefault(); closeMenu(); });
	return {
		launch, openMenu, closeMenu, teardown,
		active: function () { return game !== null; },
		playing: function () { return game !== null && entered && !menu.open; },
		menu: function () { return menu.open ? menu : null; },
		back: function () { if (menu.open) closeMenu(); else openMenu(); },
	};
};
