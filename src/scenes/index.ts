import { act } from 'react';
import { MapEvent, P } from '../types';
import { ROOT } from './constants';

export const eventtimes: MapEvent = new Map([
	[0, { name: 'enter' }],
	[1000, { name: 'start_sound_fr' }],
	[1100, { name: 'action01' }],
	[1500, { name: 'action02' }],
	[
		3000,
		{
			name: 'action03',
			data: { style: { 'font-size': 100, 'background-color': 'cyan' } },
		},
	],
	[3200, { name: 'action04' }],
	[4000, { name: 'action05' }],
	[6500, { name: 'end_music_fr' }],
]);

const TEXT = 'text';
const root = {
	type: P.LAYER,
	initial: {
		tag: 'div',
		id: ROOT,
		className: 'container-grid',
		style: {
			position: 'relative',
			backgroundColor: 'lch(52.2% 72.2 50 / 1)',
			// scale: 0.6,
		},
	},
	actions: {
		action01: {
			style: {
				backgroundColor: 'lch(56% 63.61 262.73 / 0.5)',

				duration: 3500,
				scale: { to: 0.6, duration: 3500 },
				rotate: { to: '-30deg', duration: 3000 },
			},
		},
	},
} as const;

const counter = {
	type: P.TEXT,
	initial: {
		id: TEXT,
		className: 'initial item2',
		// content: 'start',
		style: {
			backgroundColor: 'orangered',
			padding: 8,
			'font-size': '12px',
			'text-align': 'center',
			// x: '150px',
		},
	},
	actions: {
		enter: {
			move: `#${ROOT}`,
			className: 'enter',
			style: {
				transformOrigin: 'bottom right',
				backgroundColor: 'lch(56% 63.61 262.73 / 0.5)',
				rotate: { to: '30deg', duration: 1500 },
			},
		},
		action01: {
			className: 'action01',
		},
		action02: {
			className: {
				add: 'item4',
				remove: 'item2',
			},
			move: true,
			style: {
				'font-weight': 'bold',
				skew: { x: 0.5, y: 0.5 },
				scale: { to: 2.6, duration: 3500 },
				'font-size': { to: '60px', duration: 2500 },
			},
		},
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

const text1 = {
	type: P.TEXT,
	initial: {
		content: 'thanks',
		style: {
			backgroundColor: 'pink',
			padding: '0.25rem',
		},
	},
	actions: {
		enter: {
			move: `#${TEXT}`,
		},
		action01: {
			style: {
				rotate: { to: '30deg', duration: 1500 },
			},
		},
	},
} as const;

const text3 = {
	type: P.TEXT,
	initial: {
		content: 'Lancement',
		className: 'initial text3 item5',
		style: {
			backgroundColor: 'yellow',
			padding: '1rem',
			'font-size': '2rem',
			x: '-30px',
		},
	},
	actions: {
		enter: {
			move: `#${ROOT}`,
		},
		action02: {
			className: {
				add: 'item6',
				remove: 'item5',
			},
			move: true,
		},
		action03: {
			className: {
				add: 'item4',
				remove: 'item6',
			},
			move: true,
			style: {
				color: 'cyan',
			},
		},
	},
} as const;

export const persos = [root, counter, text1, text3];
