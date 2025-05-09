import { MapEvent, P, Perso } from '../types';
import { ROOT } from '../player/constants';

export const eventtimes: MapEvent = new Map([
	[0, { name: 'enter' }],
	[1.0, { name: 'start_sound_fr' }],
	[1.1, { name: 'action01' }],
	[1.5, { name: 'action02' }],
	[
		3.0,
		{
			name: 'action03',
			data: { style: { 'font-size': 100, 'background-color': 'cyan' } },
		},
	],
	[3.2, { name: 'action04' }],
	[4.0, { name: 'action05' }],
	[6.5, { name: 'end_music_fr' }],
]);

const root: Perso = {
	type: P.LIST,
	initial: {
		tag: 'div',
		id: ROOT,
		className: 'container-grid',
		style: {
			position: 'relative',
			backgroundColor: 'lch(50% 72 50 / 0.5)',
			// scale: 0.6,
		},
	},
	actions: {
		enter: {
			style: {
				backgroundColor: 'lch(56% 64 263 / 1)',
				duration: 3.5,
				// scale: 0.6,
				// rotate: -30,
				// scale: { to: 0.6, duration: 500 },
				// rotate: { to: '-30deg', duration: 3000 },
			},
		},
	},
} as const;

const COUNTER = 'counter';
const counter: Perso = {
	type: P.TEXT,
	initial: {
		id: COUNTER,
		className: 'initial item2',
		move: ROOT,
		content: 'start',
		style: {
			backgroundColor: 'orangered',
			padding: 8,
			'font-size': '2cqi',
			'text-align': 'center',
		},
	},
	actions: {
		enter: {},
		action01: {
			className: { add: 'action01' },
			style: {
				// transformOrigin: 'bottom right',
				// backgroundColor: 'lch(56% 63.61 262.73 / 0.5)',
				// rotate: { to: '30deg', duration: 1500 },
				// scale: { to: 0.6, duration: 1500 },
				// x: 0,
				scale: 1.5,
				duration: 1,
				rotate: 90,
			},
		},
		action02: {
			className: {
				add: 'item4',
				remove: 'item2',
			},
			move: true,
			style: {
				'font-weight': 'bold',
				// skew: 45,
				// scale: { to: 2.6, duration: 1500 },
				// rotate: '30deg',

				// scale: 2.6,
				// 'font-size': { to: '5cqi', duration: 1500 },
				// 'font-size': '5cqi',
			},
		},
		// ,
		// action03: {
		// 	className: {
		// 		add: 'item3',
		// 		remove: 'item4',
		// 	},
		// 	move: true,
		// 	style: {
		// 		color: 'blue',
		// 		'font-size': { to: '20px' },
		// 	},
		// },
	},
} as const;

const text1: Perso = {
	type: P.TEXT,
	initial: {
		id: 'text1',
		content: 'thanks',
		move: COUNTER,
		style: {
			backgroundColor: 'pink',
			padding: '0.25rem',
		},
	},
	actions: {
		enter: {},
		action01: {
			style: {
				// rotate: { to: '30deg', duration: 1500 },
				rotate: 30,
			},
		},
	},
} as const;

const text3: Perso = {
	type: P.TEXT,
	initial: {
		id: 'text3',
		content: 'Lancement',
		className: 'initial text3 item5',
		move: ROOT,
		style: {
			backgroundColor: 'yellow',
			padding: '1rem',
			'font-size': '2cqi',
			// x: '-60px',
			color: 'rgb(40, 47, 255)',
		},
	},
	actions: {
		enter: {},
		action02: {
			className: {
				add: 'item6',
				remove: 'item5',
			},
			move: true,
			style: {
				color: 'rgb(255, 168, 40)',
			},
		},
		action03: {
			className: {
				add: 'item4',
				remove: 'item6',
			},
			move: true,
		},
	},
} as const;

export const persos = [root, counter, text1, text3];
