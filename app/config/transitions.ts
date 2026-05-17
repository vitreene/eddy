import { INTRO, OUTRO } from "@/config/constants";

type MotionValue = { from?: number | string; to: number | string };

export type TransitionStyle = Record<string, MotionValue>;
export type TransitionAction = typeof INTRO | typeof OUTRO;

export type TransitionPreset = {
	name: string;
	[INTRO]: { style: TransitionStyle };
	[OUTRO]: { style: TransitionStyle };
};

export const transitions = {
	"--": {
		name: "--",
		[INTRO]: { style: {} },
		[OUTRO]: { style: {} }
	},
	cut: {
		name: "cut",
		[INTRO]: { style: {} },
		[OUTRO]: { style: {} }
	},
	fade: {
		name: "fondu",
		[INTRO]: {
			style: {
				opacity: { from: 0, to: 1 }
			}
		},
		[OUTRO]: {
			style: {
				opacity: { to: 0 }
			}
		}
	},
	"swipe-left": {
		name: "balayage gauche",
		[INTRO]: {
			style: {
				opacity: { from: 0, to: 1 },
				x: { from: -250, to: 0 }
			}
		},
		[OUTRO]: {
			style: {
				opacity: { to: 0 },
				x: { to: -250 }
			}
		}
	},
	"swipe-right": {
		name: "balayage droit",
		[INTRO]: {
			style: {
				opacity: { from: 0, to: 1 },
				x: { from: 250, to: 0 }
			}
		},
		[OUTRO]: {
			style: {
				opacity: { to: 0 },
				x: { to: 250 }
			}
		}
	},
	"swipe-top": {
		name: "balayage haut",
		[INTRO]: {
			style: {
				opacity: { from: 0, to: 1 },
				y: { from: -250, to: 0 }
			}
		},
		[OUTRO]: {
			style: {
				opacity: { to: 0 },
				y: { to: -250 }
			}
		}
	},
	"swipe-down": {
		name: "balayage bas",
		[INTRO]: {
			style: {
				opacity: { from: 0, to: 1 },
				y: { from: 250, to: 0 }
			}
		},
		[OUTRO]: {
			style: {
				opacity: { to: 0 },
				y: { to: 250 }
			}
		}
	},
	zoom: {
		name: "zoom",
		[INTRO]: {
			style: {
				opacity: { from: 0, to: 1 },
				scale: { from: 0.2, to: 1 }
			}
		},
		[OUTRO]: {
			style: {
				opacity: { to: 0 },
				scale: { to: 2.5 }
			}
		}
	}
} satisfies Record<string, TransitionPreset>;

export type TransitionKey = keyof typeof transitions;

export const DEFAULT_TRANSITION_BY_ACTION: Record<TransitionAction, TransitionKey> = {
	[INTRO]: "fade",
	[OUTRO]: "fade"
};

export function normalizeTransitionAction(action: string | null | undefined): TransitionAction {
	return action === OUTRO ? OUTRO : INTRO;
}

export function normalizeTransitionRef(ref: string | null | undefined, action: string): TransitionKey {
	const normalizedAction = normalizeTransitionAction(action);
	if (!ref) return DEFAULT_TRANSITION_BY_ACTION[normalizedAction];

	const raw = ref.trim();
	if (!raw) return DEFAULT_TRANSITION_BY_ACTION[normalizedAction];

	if (raw in transitions) {
		return raw as TransitionKey;
	}

	return DEFAULT_TRANSITION_BY_ACTION[normalizedAction];
}

export function getTransitionPreset(
	ref: string | null | undefined,
	action: string
): {
	key: TransitionKey;
	name: string;
	style: TransitionStyle;
} {
	const normalizedAction = normalizeTransitionAction(action);
	const key = normalizeTransitionRef(ref, normalizedAction);
	const preset = transitions[key];
	return {
		key,
		name: preset.name,
		style: preset[normalizedAction].style
	};
}

export function getTransitionOptions(action: string): Array<{ key: TransitionKey; name: string }> {
	const normalizedAction = normalizeTransitionAction(action);
	const defaultsFirst = Object.entries(transitions)
		.map(([key, preset]) => ({
			key: key as TransitionKey,
			name: preset.name,
			style: preset[normalizedAction].style
		}))
		.filter(({ style }) => style !== undefined);

	return defaultsFirst.map(({ key, name }) => ({ key, name }));
}
