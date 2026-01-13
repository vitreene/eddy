export const fadeIn = {
	name: "fondu entrée",
	style: {
		opacity: { from: 0, to: 1 }
	}

	// from: {
	// 	opacity: 0,
	// },
	// to: {
	// 	opacity: 1,
	// },
};

export const fadeOut = {
	name: "fondu sortie",
	style: {
		opacity: { to: 0 }
	}

	// from: {
	// 	opacity: 0,
	// },
	// to: {
	// 	opacity: 1,
	// },
};

export const swipeLeftIn = {
	name: "entrée balayage gauche",
	style: {
		opacity: { from: 0, to: 1 },
		x: { from: -250, to: 0 }
	}
};
export const swipeLeftOut = {
	name: "sortie balayage gauche",
	style: {
		opacity: { to: 0 },
		x: { to: -250 }
	}
};

export const swipeRightIn = {
	name: "entrée balayage droit",
	style: {
		opacity: { from: 0, to: 1 },
		x: { from: 250, to: 0 }
	}
};
export const swipeRightOut = {
	name: "sortie balayage droit",
	style: {
		opacity: { to: 0 },
		x: { to: 250 }
	}
};
export const swipeTopIn = {
	name: "entrée balayage haut",
	style: {
		opacity: { from: 0, to: 1 },
		y: { from: -250, to: 0 }
	}
	// from: {
	// 	opacity: 0,
	// 	y: 250,
	// },
	// to: {
	// 	opacity: 1,
	// 	x: 0,
	// },
};
export const swipeTopOut = {
	name: "sortie balayage haut",
	style: {
		opacity: { to: 0 },
		y: { to: -250 }
	}
};
export const swipeDownIn = {
	name: "entrée balayage bas",
	style: {
		opacity: { from: 0, to: 1 },
		y: { from: 250, to: 0 }
	}
	// from: {
	// 	opacity: 0,
	// 	y: 250,
	// },
	// to: {
	// 	opacity: 1,
	// 	x: 0,
	// },
};
export const swipeDownOut = {
	name: "sortie balayage bas",
	style: {
		opacity: { to: 0 },
		y: { to: 250 }
	}
};

export const fadeScaleIn = {
	name: "fondu zoom in",
	style: {
		opacity: { from: 0, to: 1 },
		scale: { from: 0.2, to: 0 }
	}
	// from: {
	// 	opacity: 0,
	// 	scale: 0.2,
	// },
	// to: {
	// 	opacity: 1,
	// 	scale: 1,
	// },
};
export const fadeScaleOut = {
	name: "fondu zoom out",
	style: {
		opacity: { from: 0, to: 1 },
		scale: { from: 2.5, to: 0 }
	}
	// from: {
	// 	opacity: 0,
	// 	scale: 2.5,
	// },
	// to: {
	// 	opacity: 1,
	// 	scale: 1,
	// },
};

export const DEFAULT_IN = fadeIn;
export const DEFAULT_OUT = fadeOut;
