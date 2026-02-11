// @ts-nocheck
import type { DbSceneComp, ItemComp, SceneContent, TextTime } from "@/api/db";
import type { Event as MediaEvent } from "@prisma/client";

import { P } from "../types";
import type { ID, MapEvent, PersoImgDef, PersoMediaDef, PersoDef, PersoVideoDef, Action } from "../types";
import { ROOT } from "~/player/constants";

import "./style.css";

export type Store = Record<ID, PersoDef | PersoVideoDef>;

const defaultPathImage = "";

const LIST = "list";
const START = "start";

export type BuildPlayType = ReturnType<typeof buildPlay>;

export function buildPlay(scene: DbSceneComp) {
	const mediasEvents = new Map(scene.medias.flatMap((m) => m.events).map((e) => [e.name, e]));

	const sceneEvents: MapEvent = new Map();
	sceneEvents.set(0, { name: "go" });

	const persos = {} as Store;

	for (const capsule of scene.capsules) {
		for (const element of capsule.elements) {
			const prefix = `${element.capsuleId}_${element.id}`;
			element.events.forEach((e) => {
				const [start, action] = createEvent(e, prefix, mediasEvents);
				if (start != undefined && action != undefined) {
					if (sceneEvents.has(start)) {
						const actions = sceneEvents.get(start);
						if (actions != undefined) {
							if (Array.isArray(actions)) actions.push(action);
							else sceneEvents.set(start, [actions, action]);
						}
					} else sceneEvents.set(start, action);
				}
				persos[ROOT] = root;
				persos[LIST] = list;
				persos[String(element.id)] = createBackgroundImage(element);
			});
		}
	}

	scene.medias.forEach((media) => {
		if (media.type == "sound") {
			const perso = createVideoPerso(media);
			persos[media.id] = perso;
		}
	});

	return { events: sceneEvents, persos: Object.values(persos) };
}

function createEvent(
	elementEvent: MediaEvent,
	prefix: string,
	mediasEvents: Map<string, TextTime>
): [number, { name: string }] | [] {
	const mEvent = mediasEvents.get(elementEvent.name);
	return mEvent ? [Math.round(mEvent.start * 10) * 100, { name: `${prefix}_${elementEvent.action}` }] : [];
}

function createBackgroundImage(element: ItemComp): PersoImgDef {
	const actions: Record<string, Action> = {};

	for (const e of element.events) {
		actions[`${element.capsuleId}_${element.id}_${e.action}`] = backgroundImageTransition[e.action];
	}

	return {
		type: P.IMG,
		initial: {
			id: element.id,
			className: "background-carousel-item",
			src: `/${element.media.path ?? defaultPathImage}`,
			move: LIST
		},
		actions
	};
}

const backgroundImageTransition: Record<string, Action> = {
	intro: {
		move: LIST,
		style: {
			x: { from: -400, to: 0 },
			opacity: { from: 0, to: 1 }
		}
	},
	outro: {
		style: {
			x: { from: 0, to: 400 },
			opacity: { from: 1, to: 0 }
		}
	}
};

const root = {
	type: P.LIST,
	initial: {
		tag: "div",
		id: ROOT,
		className: "container-grid",
		style: {
			position: "relative",
			backgroundColor: "lch(50% 72 50 / 0.5)"
		}
	},
	actions: {
		[ROOT]: true,
		go: {
			style: {
				backgroundColor: {
					to: "lch(56% 64 263 / 1)"
				},
				duration: 1500
			}
		}
	}
} as const;

const list = {
	type: P.LIST,
	initial: {
		tag: "div",
		id: LIST,
		className: "background-carousel",

		move: ROOT
	},
	actions: {
		[LIST]: true
	}
} as const;

function createVideoPerso(media: SceneContent): PersoMediaDef {
	return {
		type: P.VIDEO,
		initial: {
			id: media.id,
			src: media.path || defaultPathImage,
			attr: { controls: "true" /* autoplay: 'true' , muted: true */ }
		},
		actions: {
			go: {
				move: ROOT,
				media: {
					action: "play"
				}
			}
		}
	};
}

/* 
const img1 = {
	type: P.IMG,
	initial: {className: 'background-carousel',
		content: { src: '/mandrake.jpg' },
	},
	actions: {
		enter: {
			move: { to: ROOT, order: 11 },
			transition: {
				from: { scale: 0, opacity: 0 },
				to: { scale: 1, opacity: 1 },
				duration: 1000,
			},
			style: { order: 11 },
		},
		action02: {
			transition: {
				to: {
					'object-position': '50% 50%',
					'background-color': 'oklch(0.42 0.19 328.37 / 0)',
				},
				duration: 1000,
			},

			style: {
				'object-fit': 'contain',
			},
			content: { src: '/old-television.webp' },
		},
	},
} as const;
*/

//TODO
/* 
	construire la liste des actions avec l'indicateur de temps
	e.name = ref TimeEvent -> start
	e.action -> name
	Map([3000, { name: 'action03', data: {} }])
	
	*/
/* 
	pour chaque media dans chaque capsule :
	- identitfier le textime de chaque action;
	faire un tableau  [TextTime[e.name].start : { name: e.action } ] // [ ]
	
	dans la mesure ou l'ensemble est reconstruit à chaque modification, il pourrait suffire de renommer les actions ${media.id}_${action.name}
	
	*/
