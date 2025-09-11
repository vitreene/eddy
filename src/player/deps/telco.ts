import type { Timeline } from 'animejs';
import { SCENE_ID } from '../../player/constants';

type Telco = {
	seek: (
		time: number,
		muteCallbacks?: number | boolean,
		internalRender?: number | boolean
	) => Timeline;
	pause: () => Timeline;
	play: () => Timeline;
	duration: number;
	susbscribe: (up: Function) => () => void;
};

export function createTelco(telco: Telco) {
	if (document.querySelector('#telco')) return;
	const { slider, playButton, progress } = createTelcoElement();

	slider.addEventListener('mousedown', () => {
		slider.addEventListener('mousemove', mousemove);
	});
	slider.addEventListener('mouseup', () => {
		slider.removeEventListener('mousemove', mousemove);
	});
	slider.addEventListener('click', mousemove);

	playButton.addEventListener('click', togglePlay);

	function mousemove(): void {
		const p = (Number(slider.value) * telco.duration) / 100;
		const progression = p > 0 ? p : 0;
		progress.textContent = Math.round(Number(slider.value)) + '%';
		// progress.textContent = Math.round(progression) + 'ms';
		telco.seek(progression, false);
		playButton.innerText = 'play';
		toggle = false;
	}

	let toggle = true;
	function togglePlay(): void {
		if (toggle) {
			telco.pause();
			playButton.innerText = 'play';
			toggle = false;
		} else {
			telco.play();
			playButton.innerText = 'pause';
			toggle = true;
		}
	}

	telco.susbscribe((self: Timeline) => {
		const p = (self.currentTime / telco.duration) * 100;
		progress.textContent = Math.round(p) + '%';
		slider.value = `${p}`;
	});
}

function createTelcoElement() {
	const command = document.createElement('div');
	command.id = 'telco';

	const slider = document.createElement('input');
	slider.setAttribute('type', 'range');
	slider.setAttribute('min', '0');
	slider.setAttribute('max', '100');
	slider.setAttribute('step', '1');

	const playButton = document.createElement('button');
	playButton.innerText = 'pause';

	const progress = document.createElement('span');
	command.appendChild(playButton);
	command.appendChild(slider);
	command.appendChild(progress);

	const container = document.getElementById(`${SCENE_ID}`);
	if (!container) throw new Error("le conteneur n'est pas défini");

	container.appendChild(command);

	return {
		command,
		slider,
		playButton,
		progress,
	};
}
