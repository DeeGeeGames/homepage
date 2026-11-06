const readGame = function (panel) {
	if (!(panel instanceof HTMLElement)) return null;

	const heading = panel.querySelector('.game-title');
	const status = panel.querySelector('.status');
	const launch = panel.querySelector('.launch');
	const art = panel.querySelector('.art');
	const name = heading?.textContent?.trim();
	const state = status?.textContent?.trim();
	const accent = panel.dataset.accent;
	const kind = panel.dataset.kind;

	if (
		!(heading instanceof HTMLHeadingElement)
		|| !(status instanceof HTMLElement)
		|| !(launch instanceof HTMLAnchorElement)
		|| !(art instanceof HTMLElement)
		|| !name
		|| !state
		|| !heading.id
		|| panel.getAttribute('aria-labelledby') !== heading.id
		|| !accent
		|| !CSS.supports('color', accent)
		|| (kind !== 'game' && kind !== 'prototype')
	) return null;

	return { panel, heading, art, name, state, accent, kind };
};

const enhanceDial = function () {
	const root = document.getElementById('arcade');
	if (!(root instanceof HTMLElement)) return;

	const wheel = root.querySelector('#wheel');
	const track = wheel?.querySelector('.wheel-track');
	const controls = root.querySelector('#dial-controls');
	const previous = controls?.querySelector('#prev');
	const next = controls?.querySelector('#next');
	const position = controls?.querySelector('#position');
	const picker = controls?.querySelector('#jump');
	const announcement = root.querySelector('#announcement');
	const reactionArt = root.querySelector('.reaction-art');
	const viewSwitch = reactionArt?.querySelector('#view-switch');
	const reactionCaption = reactionArt?.querySelector('#reaction-caption');
	const panels = Array.from(root.querySelectorAll('.game-panel'));
	const records = panels.map(readGame);

	if (
		!(wheel instanceof HTMLElement)
		|| !(track instanceof HTMLElement)
		|| !(controls instanceof HTMLElement)
		|| !(previous instanceof HTMLButtonElement)
		|| !(next instanceof HTMLButtonElement)
		|| !(position instanceof HTMLElement)
		|| !(picker instanceof HTMLSelectElement)
		|| !(announcement instanceof HTMLElement)
		|| !(reactionArt instanceof HTMLElement)
		|| !(viewSwitch instanceof HTMLButtonElement)
		|| !(reactionCaption instanceof HTMLElement)
		|| records.length < 2
		|| records.some(function (game) { return game === null; })
	) return;

	const games = records.filter(function (game) { return game !== null; });
	if (new Set(games.map(function (game) { return game.heading.id; })).size !== games.length) return;

	const total = games.length;
	const mobile = window.matchMedia('(max-width: 650px)');
	const slotsBeforeSelection = Math.floor(total / 2);
	const slotsAfterSelection = total - slotsBeforeSelection - 1;
	const choices = games.map(function (game, index) {
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'wheel-choice';
		button.dataset.index = String(index);
		button.setAttribute('aria-label', `${game.name}, ${game.state}`);
		button.setAttribute('aria-pressed', 'false');
		button.tabIndex = -1;

		const number = document.createElement('span');
		number.className = 'wheel-number';
		number.textContent = String(index + 1).padStart(2, '0');
		number.setAttribute('aria-hidden', 'true');

		const name = document.createElement('span');
		name.className = 'wheel-name';
		name.append(document.createTextNode(game.name));

		const state = document.createElement('small');
		state.textContent = game.state;
		name.append(state);
		button.append(number, name);
		return button;
	});
	const options = games.map(function (game, index) {
		const option = document.createElement('option');
		option.value = String(index);
		option.textContent = `${String(index + 1).padStart(2, '0')} · ${game.name}${game.kind === 'prototype' ? ' · Prototype' : ''}`;
		return option;
	});

	let current = 0;
	let lastSwipe = -Infinity;

	const arrange = function () {
		previous.textContent = mobile.matches ? '←' : '↑';
		next.textContent = mobile.matches ? '→' : '↓';

		choices.forEach(function (choice, index) {
			const clockwise = (index - current + total) % total;
			const offset = clockwise > slotsAfterSelection ? clockwise - total : clockwise;
			const previousOffset = Number(choice.dataset.offset ?? offset);
			choice.classList.toggle('wrap', Math.abs(previousOffset - offset) > slotsBeforeSelection);
			choice.dataset.offset = String(offset);
			choice.style.setProperty('--wheel-y', `${(offset + slotsBeforeSelection) * 54}px`);
			choice.style.setProperty('--wheel-x', `${Math.round(27 - Math.abs(offset) * 7)}px`);
			choice.style.setProperty('--wheel-scale', String(Math.max(0.7, 1 - Math.abs(offset) * 0.045)));
			choice.style.setProperty('--wheel-opacity', String(Math.max(0.55, 1 - Math.abs(offset) * 0.09)));
		});

		const selected = choices[current];
		if (!selected) return;

		track.style.transform = mobile.matches
			? `translateX(${wheel.clientWidth / 2 - selected.offsetLeft - selected.offsetWidth / 2}px)`
			: '';
	};

	const updateHash = function (headingId) {
		const hash = `#${encodeURIComponent(headingId)}`;
		if (window.location.hash === hash) return;

		try {
			// Replacing the current entry avoids a history step for every dial turn.
			window.history.replaceState(window.history.state, '', hash);
		} catch {
			// Selection still works in contexts that prohibit history updates.
		}
	};

	const select = function (index, { focus = false, announce = true, saveHash = true } = {}) {
		if (!Number.isInteger(index)) return;

		const selection = ((index % total) + total) % total;
		const selectedGame = games[selection];
		const selectedChoice = choices[selection];
		if (!selectedGame || !selectedChoice) return;

		const focusedInWheel = choices.includes(document.activeElement);
		const changed = current !== selection;
		track.classList.toggle('jump-cut', Math.abs(selection - current) > 1);
		current = selection;

		if (changed) root.classList.add('has-selected');
		games.forEach(function (game, gameIndex) {
			game.panel.hidden = gameIndex !== current;
			game.panel.classList.toggle('is-active', gameIndex === current);
		});
		choices.forEach(function (choice, choiceIndex) {
			choice.setAttribute('aria-pressed', String(choiceIndex === current));
			choice.tabIndex = choiceIndex === current ? 0 : -1;
		});
		root.style.setProperty('--accent', selectedGame.accent);
		picker.value = String(current);
		position.textContent = String(current + 1).padStart(2, '0');
		arrange();

		if (focus || focusedInWheel) selectedChoice.focus({ preventScroll: true });
		if (saveHash) updateHash(selectedGame.heading.id);
		if (announce) {
			announcement.textContent = `${selectedGame.name}, ${selectedGame.state}, ${current + 1} of ${total}`;
		}
	};

	const indexFromHash = function () {
		let target;
		try {
			target = decodeURIComponent(window.location.hash.slice(1));
		} catch {
			return -1;
		}

		if (target === '') return 0;

		if (target === 'games' || target === 'games-heading') {
			return games.findIndex(function (game) { return game.kind === 'game'; });
		}
		if (target === 'experiments' || target === 'experiments-heading') {
			return games.findIndex(function (game) { return game.kind === 'prototype'; });
		}
		return games.findIndex(function (game) { return game.heading.id === target; });
	};

	const followHash = function () {
		const index = indexFromHash();
		const game = games[index];
		if (!game) return;

		select(index, { saveHash: false });
		// The enhanced section wrappers may use display: contents, so scroll to
		// the revealed game rather than relying on the wrapper's layout box.
		if (window.location.hash === '') {
			window.scrollTo({ top: 0, behavior: 'instant' });
		} else {
			game.panel.scrollIntoView({ block: 'start', behavior: 'instant' });
		}
	};

	choices.forEach(function (choice, index) {
		choice.addEventListener('click', function (event) {
			if (event.detail > 0 && performance.now() - lastSwipe < 400) {
				event.preventDefault();
				return;
			}
			select(index);
		});
		choice.addEventListener('keydown', function (event) {
			if (event.altKey || event.ctrlKey || event.metaKey) return;

			const destination = {
				ArrowDown: index + 1,
				ArrowRight: index + 1,
				ArrowUp: index - 1,
				ArrowLeft: index - 1,
				Home: 0,
				End: total - 1,
			}[event.key];
			if (destination === undefined) return;

			event.preventDefault();
			select(destination, { focus: true });
		});
	});
	previous.addEventListener('click', function () { select(current - 1); });
	next.addEventListener('click', function () { select(current + 1); });
	picker.addEventListener('change', function () {
		const index = Number(picker.value);
		if (index >= 0 && index < total) select(index);
	});

	const addSwipe = function (surface) {
		let origin = null;

		surface.addEventListener('pointerdown', function (event) {
			if (event.pointerType !== 'touch' || !event.isPrimary) return;
			if (event.target instanceof Element && event.target.closest('.view-switch, a, select')) return;

			origin = { id: event.pointerId, x: event.clientX, y: event.clientY };
		});
		surface.addEventListener('pointermove', function (event) {
			if (!origin || event.pointerId !== origin.id) return;

			const dx = event.clientX - origin.x;
			const dy = event.clientY - origin.y;
			if (Math.abs(dx) <= 55 || Math.abs(dx) <= Math.abs(dy) * 1.4) return;

			try {
				// Capture only after a horizontal gesture, preserving ordinary taps
				// on wheel buttons and the browser's vertical pan behavior.
				surface.setPointerCapture(event.pointerId);
			} catch {
				// A cancelled or synthetic pointer may no longer be capturable.
			}
		});
		surface.addEventListener('pointerup', function (event) {
			if (!origin || event.pointerId !== origin.id) return;

			const dx = event.clientX - origin.x;
			const dy = event.clientY - origin.y;
			origin = null;
			if (Math.abs(dx) <= 55 || Math.abs(dx) <= Math.abs(dy) * 1.4) return;

			lastSwipe = performance.now();
			select(current + (dx < 0 ? 1 : -1));
			event.preventDefault();
		});
		surface.addEventListener('pointercancel', function (event) {
			if (origin?.id === event.pointerId) origin = null;
		});
		surface.addEventListener('lostpointercapture', function (event) {
			// A child's implicit capture ends when a swipe transfers to this
			// surface. Only losing the surface's own capture cancels it.
			if (event.target === surface && origin?.id === event.pointerId) origin = null;
		});
	};
	addSwipe(wheel);
	games.forEach(function (game) { addSwipe(game.art); });

	const showFullScreenshot = function (full) {
		reactionArt.classList.toggle('detail-view', !full);
		viewSwitch.setAttribute('aria-pressed', String(full));
		viewSwitch.textContent = 'Full screenshot';
		reactionCaption.textContent = full
			? 'Full shared-screen development screenshot'
			: 'Challenge detail · development screenshot';
	};
	viewSwitch.addEventListener('click', function () {
		showFullScreenshot(viewSwitch.getAttribute('aria-pressed') !== 'true');
	});

	track.replaceChildren(...choices);
	picker.replaceChildren(...options);
	showFullScreenshot(false);
	viewSwitch.hidden = false;
	controls.hidden = false;
	wheel.hidden = false;
	root.classList.add('enhanced');

	const initial = indexFromHash();
	select(initial >= 0 ? initial : 0, { announce: false, saveHash: false });
	window.addEventListener('hashchange', followHash);
	window.addEventListener('resize', arrange);
};

enhanceDial();
