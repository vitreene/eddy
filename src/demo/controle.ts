import { animate, createTimeline, utils } from 'animejs';

export function setControl() {
	if (!document.querySelector('#controls')) return;
	const control = document.createElement('div');
	control.id = 'controls';
	control.innerHTML = html;
	document.body.appendChild(control);
}

const [$digitalClock] = utils.$('#digital');

const s = 1000;
const m = 60 * s;
const h = 60 * m;
const oneday = h * 24;

const masterTL = createTimeline({
	defaults: { ease: 'linear' },
	autoplay: false,
});

[h * 10, h, 0, m * 10, m, 0, s * 10, s, 0, 100, 10].forEach((d) => {
	const $el = document.createElement('div');
	$digitalClock.appendChild($el);
	$el.classList.add('slot');
	if (!d) {
		$el.classList.add('colon');
		$el.textContent = ':';
	} else {
		$el.classList.add('numbers');
		for (let i = 0; i < 10; i++) {
			const $num = document.createElement('div');
			$num.textContent = `${i}`;
			utils.set($num, { rotateX: i * 36, z: '3ch' });
			$el.appendChild($num);
		}
		const canStop = d > 100;
		const ease = canStop ? 'cubicBezier(1,0,.6,1.2)' : 'linear';
		const duration = canStop ? 650 : d;
		const position = `+=${canStop ? d - 650 : 0}`;
		const numTL = createTimeline({ defaults: { ease }, loop: true });
		const t =
			d === h * 10 ? 4 : d === h ? 25 : d === m * 10 || d === s * 10 ? 7 : 11;
		for (let i = 1; i < t; i++) {
			const rotateX = -(i * 36 + (i === t - 1 ? 360 - i * 36 : 0));
			numTL.add(
				$el,
				{ rotateX, duration },
				d === h * 10 && i === t - 1 ? '+=' + (h * 4 - 650) : position
			);
		}
		masterTL.sync(numTL, 0);
	}
});

masterTL.duration = oneday;
masterTL.iterationDuration = oneday;

const getNow = () => new Date().getTime() % oneday;

const [$currentTimeRange] = utils.$(
	'#currentTime .range'
) as Array<HTMLInputElement>;
const [$currentTimeValue] = utils.$(
	'#currentTime .value'
) as Array<HTMLInputElement>;

const [$speedRange] = utils.$('#speed .range') as Array<HTMLInputElement>;
const [$speedValue] = utils.$('#speed .value') as Array<HTMLInputElement>;

masterTL.currentTime = getNow();
// masterTL.currentTime = oneday - 3000;

masterTL.onUpdate = ({ currentTime, speed }) => {
	$currentTimeRange.value = `${currentTime}`;
	$currentTimeValue.value = `${currentTime}`;
	$speedRange.value = `${speed}`;
	$speedValue.value = `${utils.round(speed, 0)}`;
};

utils.$('#controls button').forEach(($button) => {
	const id = $button.id;
	$button.onclick = () => {
		if (id === 'seek') {
			animate(masterTL, {
				currentTime: getNow(),
				ease: 'inOut(3)',
				duration: 1500,
			});
		} else if (id === 'slowmo') {
			animate(masterTL, {
				speed: 0.1,
				ease: 'out(3)',
				duration: 1500,
			});
		} else if (id === 'speedup') {
			animate(masterTL, {
				speed: 5,
				ease: 'out(3)',
				duration: 1500,
			});
		} else if (id === 'normalspeed') {
			animate(masterTL, {
				speed: 1,
				ease: 'out(3)',
				duration: 1500,
			});
		} else {
			masterTL[id]();
		}
	};
});

utils.$('fieldset').forEach(($el) => {
	const $range: HTMLInputElement = $el.querySelector('.range');
	const $value: HTMLInputElement = $el.querySelector('.value');
	const prop = $el.id;
	const value = masterTL[prop];
	$range.value = value;
	$value.value = masterTL[prop];
	$range.oninput = () => {
		const newValue =
			prop === 'currentTime' ? +$range.value % oneday : +$range.value;
		utils.sync(() => (masterTL[prop] = newValue));
		$value.value = `${utils.round(newValue, 0)}`;
	};
});

const html = `
<div id="clock">
  <div id="digital"></div>
</div>
<div id="parameters">
  <fieldset id="currentTime">
    <label>currentTime</label>
    <input class="value" type="text" />
    <input class="range" type="range" min="0" max="86400000" step="1" />
  </fieldset>
  <fieldset id="speed">
    <label>speed</label>
    <input class="value" type="text" value="1" />
    <input class="range" type="range" min=".01" max="2" step=".01" value="1" />
  </fieldset>
</div>
<div id="controls">
  <button id="play">PLAY</button>
  <button id="pause">PAUSE</button>
  <button id="reverse">REVERSE</button>
  <button id="alternate">ALTERNATE</button>
  <button id="slowmo">SLOW MO</button>
  <button id="speedup">SPEED UP</button>
  <button id="normalspeed">NORMAL SPEED</button>
  <button id="reset">RESET</button>
  <button id="resume">RESUME</button>
  <button id="seek">SEEK</button>
  <button id="complete">COMPLETE</button>
  <button id="restart">RESTART</button>
</div>

`;
