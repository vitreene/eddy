import { MapEvent, P, Perso } from '../types';
import { ROOT } from '../player/constants';

export const eventtimes: MapEvent = new Map([
	[0, { name: '0' }],
	[1000, { name: '1000' }],
	[1500, { name: '1500' }],
	[2000, { name: '2000' }],
	[3000, { name: '3000' }],
	[4000, { name: '4000' }],
	[5000, { name: '5000' }],
]);

const root: Perso = {
	type: P.LIST,
	initial: {
		tag: 'div',
		id: ROOT,
		className: 'container-carousel',
		style: {
			position: 'relative',
			backgroundColor: 'lch(50% 72 50 / 0.5)',
		},
	},
	actions: {
		1000: {
			style: {
				backgroundColor: { to: 'lch(56% 64 263 / 1)' },
				duration: 3500,
				scale: { to: 0.6, duration: 1500 },
				rotate: { to: '-30deg', duration: 3000 },
			},
		},
	},
} as const;

const CP01 = 'cp-01';
const capsule = {
	type: P.LIST,
	initial: {
		tag: 'section',
		id: CP01,
		move: ROOT,
		className: 'capsule01',
	},
	actions: {},
};

interface Imgs {
	src: string;
	start: number;
	end: number;
}
const ikonos = [
	{
		src: '001.jpg',
		start: 0,
		end: 1000,
	},
	{
		src: '002.jpg',
		start: 1000,
		end: 2000,
	},
	{
		src: '003.jpg',
		start: 2000,
		end: 3000,
	},
].map(
	(img: Imgs, index: number): Perso => ({
		type: P.IMG,
		initial: {
			id: `img-${index}`,
			content: `/images/${img.src}`,
			className: 'ikono',
			move: CP01,
			style: {
				opacity: 0,
				x: '-100%',
			},
		},
		actions: {
			[img.start]: {
				style: {
					x: { from: '-100%', to: '0', duration: 500 },
					opacity: { from: 0, to: 1, duration: 300 },
				},
			},
			[img.end]: {
				style: {
					y: { from: 0, to: '100%', duration: 500 },
					opacity: { from: 1, to: 0, duration: 800 },
				},
			},
		},
	})
);

export const persos = [root, capsule, ...ikonos];
