(function () {
	const vscode = acquireVsCodeApi();
	const app = document.getElementById('app');
	const state = { combos: [], profiles: [], comboId: null, profileId: null, variant: null };
	window.addEventListener('message', event => {
		const data = event.data;
		if (data.type === 'init') {
			state.combos = data.combos;
			state.profiles = data.profiles;

			if (!state.comboId && state.combos[0]) state.comboId = state.combos[0].id;

			if (!state.profileId && state.profiles[0]) state.profileId = state.profiles[0].id;

			render();
			apply();
		} else if (data.type === 'applied') renderPreview(data.palette, data.contrast);
	});

	function apply() {
		if (!state.comboId || !state.profileId) return;
		vscode.postMessage({
			type: 'apply',
			comboId: state.comboId,
			profileId: state.profileId,
			variant: state.variant || undefined,
		});
	}

	function createElement(tag, props, ...children) {
		const element = document.createElement(tag);
		Object.assign(element, props || {});
		for (const child of children) element.append(child);
		return element;
	}

	function section(title, body) {
		return createElement(
			'div',
			{ className: 'section' },
			createElement('h4', { textContent: title }),
			body,
		);
	}

	function render() {
		app.innerHTML = '';

		const combosBox = createElement('div', { className: 'row' });
		for (const combo of state.combos) {
			const button = createElement('button', {
				textContent: combo.label,
				className: combo.id === state.comboId ? 'chip active' : 'chip',
			});
			button.addEventListener('click', () => {
				state.comboId = combo.id;
				render();
				apply();
			});
			combosBox.append(button);
		}
		app.append(section('Starter combination', combosBox));

		const profBox = createElement('div', { className: 'row' });
		for (const p of state.profiles) {
			const button = createElement('button', {
				textContent: p.label,
				className: p.id === state.profileId ? 'chip active' : 'chip',
			});
			button.addEventListener('click', () => {
				state.profileId = p.id;
				state.variant = null;
				render();
				apply();
			});
			profBox.append(button);
		}
		app.append(section('Style', profBox));

		const profile = state.profiles.find(p => p.id === state.profileId);
		if (profile?.variants?.length) {
			const div = createElement('div', { className: 'row' });
			for (const variant of profile.variants) {
				const active = (state.variant || profile.variants[0]) === variant;
				const button = createElement('button', {
					textContent: variant,
					className: active ? 'chip active' : 'chip',
				});
				button.addEventListener('click', () => {
					state.variant = variant;
					render();
					apply();
				});
				div.append(button);
			}
			app.append(section('Variant', div));
		}

		app.append(createElement('div', { id: 'preview', className: 'section' }));

		const actions = createElement('div', { className: 'row' });
		const addButton = (label, type) => {
			const button = createElement('button', { textContent: label, className: 'btn' });
			button.addEventListener('click', () => vscode.postMessage({ type }));
			return button;
		};
		actions.append(addButton('Revert', 'revert'), addButton('Reset', 'reset'));
		app.append(section('Actions', actions));
	}

	function renderPreview(palette, contrast) {
		const box = document.getElementById('preview');
		if (!box) return;
		box.innerHTML = '';
		box.append(createElement('h4', { textContent: 'Palette' }));
		// A swatch is a small color sample: one square per palette color, in a row.
		const strip = createElement('div', { className: 'swatches' });
		for (const key of [
			'bg',
			'surface',
			'surfaceAlt',
			'text',
			'textMuted',
			'accent1',
			'accent2',
			'border',
		]) {
			const div = createElement('div', { className: 'swatch', title: key + ' ' + palette[key] });
			div.style.background = palette[key];
			strip.append(div);
		}
		box.append(strip);
		// WCAG contrast thresholds for normal-size text: AA needs 4.5:1, AAA needs 7:1.
		const aaLevel = contrast >= 4.5,
			aaaLevel = contrast >= 7;
		box.append(
			createElement('span', {
				className: 'badge ' + (aaaLevel ? 'ok' : aaLevel ? 'warn' : 'bad'),
				textContent:
					'text/bg contrast ' + contrast + ':1 ' + (aaaLevel ? 'AAA' : aaLevel ? 'AA' : 'FAIL'),
			}),
		);
	}
	vscode.postMessage({ type: 'ready' });
})();
