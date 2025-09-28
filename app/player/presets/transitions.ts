const DEFAULT_DURATION = 500;

export const fade = {
	name: 'fondu',
	from: {
		opacity: 0,
	},
	to: {
		opacity: 1,
	},
};

export const swipeLeft = {
	name: 'balayage gauche',
	from: {
		opacity: 0,
		x: -250,
	},
	to: {
		opacity: 1,
		x: 0,
	},
};

export const swipeRight = {
	name: 'balayage droit',
	from: {
		opacity: 0,
		x: 250,
	},
	to: {
		opacity: 1,
		x: 0,
	},
};
export const swipeTop = {
	name: 'balayage haut',
	from: {
		opacity: 0,
		y: 250,
	},
	to: {
		opacity: 1,
		x: 0,
	},
};
export const swipeDown = {
	name: 'balayage bas',
	from: {
		opacity: 0,
		y: 250,
	},
	to: {
		opacity: 1,
		x: 0,
	},
};

export const fadeScaleIn = {
	name: 'fondu zoom in',

	from: {
		opacity: 0,
		scale: 0.2,
	},
	to: {
		opacity: 1,
		scale: 1,
	},
};
export const fadeScaleOut = {
	name: 'fondu zoom out',
	from: {
		opacity: 0,
		scale: 2.5,
	},
	to: {
		opacity: 1,
		scale: 1,
	},
};
