import { animate, createTimeline, JSAnimation, Timeline, Timer, utils } from "animejs";

import { PubSub, type Subscribed } from "./deps/pubsub";
import { initMedias } from "./deps/init-medias";
import { createScene } from "./deps/create-scene";
import { createElements } from "./deps/create-elements";
import { mixClassNames, setStaticChanges } from "./deps/static-changes";
import { P } from "./types";
import { getAbsoluteCoords, getTransform } from "./deps/utils";
import { createFrameQueue, type FrameQueueController } from "./queue/frame-queue";

import type { Change } from "./deps/static-changes";
import type { ActionAtributes, ID, MapEvent, MediaStatus, Perso } from "./types";
import { onUpdateStaticChanges } from "./deps/on-update";

const tmDefaults = {
	// autoplay: true,
	// loop: 1,
	// alternate: true,
	onLoop: () => console.log("///////LOOP")
};

export interface TelcoProps {
	seek: (time: number) => Timeline;
	pause: () => Timeline;
	play: () => Timeline;
	replay: () => Timeline;
	revert: () => Timeline;
	readonly duration: number;
	readonly paused: boolean;

	susbscribe: (up: Subscribed<Timeline>) => () => void;
}

export class Player {
	timeLine!: Timeline;
	eventtimes!: MapEvent;
	render!: HTMLElement;
	$elements = new Map<ID, HTMLElement>();
	mediaStatus = new Map<ID, MediaStatus>();
	persos = new Map<ID, Perso>();
	persoChanges = new Map<ID, Record<number, Change>>();
	updatesTM = new PubSub<Timeline>();
	onEnd: (tm: Timer) => void = () => {};
	moveQueue!: FrameQueueController<
		{ $el: HTMLElement; before: ReturnType<typeof getAbsoluteCoords> },
		{ after: ReturnType<typeof getAbsoluteCoords>; px: number; py: number }
	>;

	telco: TelcoProps;

	constructor({
		render,
		persos,
		eventtimes,
		onEnd
	}: {
		render: HTMLElement | null;
		persos: Map<ID, Perso>;
		eventtimes: MapEvent;
		onEnd?: (tm: Timer) => void;
	}) {
		if (!render) throw new Error("Le player ne peut etre rendu.");
		this.render = render;
		this.persos = persos;
		this.eventtimes = eventtimes;
		if (typeof onEnd === "function") this.onEnd = onEnd;
		this.createElements = createElements.bind(this);
		this.initMedias = initMedias.bind(this);
		this.setStaticChanges = setStaticChanges.bind(this);
		this.createScene = createScene.bind(this);
		this.onBeforeUpdateTM = this.onBeforeUpdateTM.bind(this);

		this.init();
	}

	private init() {
		this.moveQueue = createFrameQueue({
			onError: (error, key, phase) => {
				console.error("Move queue error", { key, phase, error });
			}
		});
		this.timeLine = createTimeline(tmDefaults);
		this.createElements();
		this.initMedias();
		this.setStaticChanges();
		this.createScene();
		this.onBeforeUpdateTM();
		const updateStaticChanges = onUpdateStaticChanges.bind(this)();
		this.updatesTM.subscribe(updateStaticChanges);

		this.initTelco();

		console.log(this);
	}

	private createElements!: () => void;
	private initMedias!: () => void;
	private setStaticChanges!: () => void;
	private createScene!: () => void;
	private onBeforeUpdateTM() {
		this.timeLine.onBeforeUpdate = (self: Timeline) => this.updatesTM.forEach((up) => up(self));
	}

	private initTelco = () => {
		console.log("INIT TELCO");

		const duration = () => this.timeLine.duration;
		const paused = () => this.timeLine.paused;
		this.telco = {
			seek: this.seek,
			pause: this.pause,
			play: this.play,
			replay: this.replay,
			revert: this.revert,
			get duration() {
				return duration();
			},
			get paused() {
				return paused();
			},
			susbscribe: (up: Subscribed<Timeline>) => this.updatesTM.subscribe(up)
		};
	};

	private play = () => {
		if (this.timeLine.paused) {
			this.timeLine.play();
			this.mediaStatus.forEach((ms) => {
				ms.node[ms.status]();
			});
		}
		return this.timeLine;
	};

	private replay = () => {
		this.timeLine.restart();
		this.seekChanges(0);
		this.seekMedias(0);
		return this.timeLine;
	};
	private pause = () => {
		this.timeLine.pause();
		this.mediaStatus.forEach((ms) => {
			(ms.node as HTMLVideoElement).pause();
		});
		return this.timeLine;
	};

	private revert = () => {
		this.moveQueue?.dispose();
		this.timeLine.revert();
		return this.timeLine;
	};

	private seek = (time: number) => {
		this.timeLine.pause();
		this.seekChanges(time);

		this.timeLine.seek(+time);
		this.seekMedias(+time);

		return this.timeLine;
	};

	private seekMedias = (time: number) => {
		this.mediaStatus.forEach((ms) => {
			const $node = ms.node as HTMLVideoElement;
			const currentime = ms.change
				? ms.change.offset + (time - ms.change.changeAt)
				: ms.startAt <= time
					? time - ms.startAt
					: 0;
			$node.currentTime = currentime / 1000;
		});
	};
	private seekChanges(time: number) {
		this.persoChanges.forEach((pcs, id) => {
			const changes = [];
			let lastParentMove: ID | null = null;

			for (const [t, pc] of Object.entries(pcs)) {
				if (Number(t) <= time) {
					changes.push(pc.change);
					if (typeof pc.change.move === "string") {
						lastParentMove = pc.change.move;
					}
				} else break;
			}
			const change = changes.reduce((a, c) => ({ ...a, ...c }), {});

			if (lastParentMove) {
				const $el = this.$elements.get(id);
				const $parent = this.$elements.get(lastParentMove);
				if ($el && $parent && $el.parentElement !== $parent) {
					$parent.appendChild($el);
				}
			}

			if (typeof change.move === "string") {
				this._moveChange(id, change);
			} else if (change.move !== true) {
				this._moveChange(id, change);
			}
			this._applyChanges(id, change);
			this.applyMediaChanges(time, id, change);
		});
	}

	_applyChanges(id: ID, change: Partial<ActionAtributes>) {
		const $el = this.$elements.get(id);

		if (change.className) {
			$el.className = mixClassNames(change.className);
		}
		if (change.content) {
			$el.textContent = change.content;
		}
		if (change.attr) {
			Object.entries(change.attr).forEach(([value, key]) => $el.setAttribute(key, value));
		}
	}

	_moveChange(id: ID, change: Partial<ActionAtributes>): JSAnimation | undefined {
		const $el = this.$elements.get(id);
		if (!$el) return undefined;

		switch (typeof change.move) {
			case "undefined": {
				// No explicit move instruction: keep current DOM parent.
				// Removing here can detach valid items from capsule containers during seek/edit cycles.
				break;
			}
			case "string":
				{
					const parent = this.$elements.get(change.move);
					if (parent) parent.appendChild($el);
				}
				break;
			//

			case "boolean": {
				const old = getAbsoluteCoords($el);
				this._applyChanges(id, change);
				const nex = getAbsoluteCoords($el);

				const px = utils.get($el, "x", false);
				const py = utils.get($el, "y", false);

				return this._createMoveTransition($el, old, nex, px, py);
			}
			default:
				break;
		}
	}

	enqueueMoveTransition(params: {
		key: string | number;
		id: ID;
		change: Partial<ActionAtributes>;
		onTransition: (transition: JSAnimation) => void;
	}) {
		const { key, id, change, onTransition } = params;
		this.moveQueue.enqueue({
			key,
			priority: 0,
			readBeforeWrite: () => {
				const $el = this.$elements.get(id);
				if (!$el) throw new Error("Missing element for move transition");
				return { $el, before: getAbsoluteCoords($el) };
			},
			applyWrite: ({ $el }) => {
				this._applyChanges(id, change);
			},
			readAfterWrite: ({ $el }) => {
				return {
					after: getAbsoluteCoords($el),
					px: Number(utils.get($el, "x", false)),
					py: Number(utils.get($el, "y", false))
				};
			},
			commit: ({ $el, before }, { after, px, py }) => {
				const transition = this._createMoveTransition($el, before, after, px, py);
				if (transition) onTransition(transition);
			}
		});
	}

	private _createMoveTransition(
		$el: HTMLElement,
		old: ReturnType<typeof getAbsoluteCoords>,
		nex: ReturnType<typeof getAbsoluteCoords>,
		px: number,
		py: number
	): JSAnimation | undefined {
		const dx = old.x - nex.x;
		const dy = old.y - nex.y;
		if (dx === 0 && dy === 0 && old.width === nex.width && old.height === nex.height) return undefined;

		const diff = getTransform($el).translate(-px, -py).invertSelf().transformPoint(new DOMPoint(dx, dy));
		return animate($el, {
			x: { from: diff.x + px, to: 0 + px },
			y: { from: diff.y + py, to: 0 + py },
			width: { from: old.width, to: nex.width },
			height: { from: old.height, to: nex.height },
			autoplay: false,
			duration: 1000,
			composition: "none"
		}).seek(0);
	}

	// changes : src, media
	private applyMediaChanges(time: number, id: ID, change: Partial<ActionAtributes>) {
		const perso = this.persos.get(id);
		if (!("media" in perso)) return;

		const $el = this.$elements.get(id);
		if (change.src) {
			($el as HTMLAudioElement | HTMLVideoElement | HTMLImageElement).src = change.src;
		}

		if (perso.type == P.VIDEO && change.media) {
			const $video = $el as HTMLVideoElement;

			const $media = this.mediaStatus.get(perso.initial.id)!;
			$media.change = {
				changeAt: change.media.changeAt,
				offset: change.media.offset
			};
			$media.startAt = time ?? 0;

			if (change.media.action == "play") {
				$media.status = "play";
				$video.currentTime = (change.media.offset ?? 0) / 1000;
				!this.timeLine.paused && $video.play();
			}
			if (change.media.action == "pause") {
				$media.status = "pause";

				$video.pause();
			}
		}
	}
}

/* 
les static changes n'ont lieu que lors d'une lecture en continu 
certains change ne sont pas encore reversibles, comme move
-> il faut les activer pour un seek, et l'algo doit etre toujours reversible 

-> deplacer la logique hors de l'update, update comme seek doivent acceder aux changes.
-> pour seek, peut-etre cumuler les changes en un seul et l'appliquer en une fois ? 
-> ca pourrait etre valable systématiquement, il n'y a pas necessairement de pénalité 
-> 
exemple : seek à 2000
persochanges à 0, 500 et 3000,
ne retenir que 0 et 500,
fusionner les changes 
(normalement  0 contient initial)
lister les attributs du node
virer ce qui n'est pas dans change
mettre à jour ce qui est dans change
move: 
- si pas de move trouvé, le node n'est pas affiché, le retirer 


*/

/* 
comment faire si j'alterne des play et pause pour un media durant la lecture ?
en lecture normale, pas de souci particulier
mais : comment maintenir l'état quand on seek ? 

au ssek :
- mise à jour du statut play | pause 
startAt doit contenir le temps ou doit rependre la video mais :
- cette mais valeur est ajoutée à la lecture , ici ce n'est pas pertinent,
- startAt marche pas ; il faudrait dire "offset" et indiquer aussi a quel moment de la timeline cette valeur a été fixée 
offset peut aussi etre défini dans l'action du perso, pour commencer une video à 2 secondes par exemple. 


exemple 
timeline : 10s
video : 6s

-- à 0s : video :pause , offset 0 
à 2s : video : play, offset : 3s
à 4s : video : pause
à 6s : video : play 

? position video à 8s sur la tm ? 
->  7s , > 6s == 6s 

à la préparation : à chaque action media, calculer offset s'il n'est pas défini 
prop "changeAt" pour définir à quel moment l'action à eu lieu

le positionnemnt de la video serait :
offset + (currentime - changeAt )

ces valeurs sont fixées au lancement de la scene.  
des valeurs légerement différentes peuvent etre mesurées au runtime ; placer ces valeurs dans une autre prop (startAt)

*/
