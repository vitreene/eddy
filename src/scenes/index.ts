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

const root = {
	type: P.LAYER,
	initial: {
		tag: 'div',
		id: ROOT,
		className: 'container-grid',
		style: {
			position: 'relative',
			backgroundColor: 'lch(52.2% 72.2 50 / 1)',
		},
	},
	actions: {
		// [ROOT]: true,
		action01: {
			// transition: {
			// 	from: { backgroundColor: 'lch(52.2% 72.2 50 / 0.5)' },
			// 	to: { backgroundColor: 'lch(56% 63.61 262.73 / 1)' },
			// 	duration: 1500,
			// },
			style: {
				backgroundColor: 'lch(56% 63.61 262.73 / 1)',
				duration: 1500,
			},
		},
	},
} as const;

const counter = {
	type: P.TEXT,
	initial: {
		className: 'initial item2',
		content: 'start',
		style: {
			backgroundColor: 'orangered',
			padding: 8,
			'font-size': 36,
			'text-align': 'center',
		},
	},
	actions: {
		enter: {
			move: `#${ROOT}`,
			className: 'enter',
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
				'font-size': { to: '60px', duration: 2500 },
			},
		},
		action03: {
			style: {
				color: 'blue',
			},
		},
	},
} as const;

export const persos = [root, counter];
