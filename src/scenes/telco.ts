import { Timeline } from 'animejs';
import { ROOT, SCENE_ID } from '../player/constants';

export function createTelco(telco: Timeline) {
	if (document.querySelector('#telco')) return;

	const command = document.createElement('div');
	command.id = 'telco';
	const slider = document.createElement('input');
	slider.setAttribute('type', 'range');
	slider.setAttribute('min', '0');
	slider.setAttribute('max', '100');
	slider.setAttribute('step', '1');
	slider.addEventListener('mousedown', () => {
		slider.addEventListener('mousemove', mousemove);
	});
	slider.addEventListener('mouseup', () => {
		slider.removeEventListener('mousemove', mousemove);
	});
	slider.addEventListener('click', mousemove);

	function mousemove(): void {
		const p = (Number(slider.value) * telco.duration) / 100 - 100;
		const progression = p > 0 ? p : 0;
		progress.textContent = Math.round(Number(slider.value)) + '%';
		progress.textContent = Math.round(progression) + 'ms';
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

	const playButton = document.createElement('button');
	playButton.innerText = 'pause';
	playButton.addEventListener('click', togglePlay);

	const progress = document.createElement('span');
	command.appendChild(playButton);
	command.appendChild(slider);
	command.appendChild(progress);

	const container = document.getElementById(`${SCENE_ID}`);
	container.appendChild(command);
}
