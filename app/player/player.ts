import { animate, createTimeline, JSAnimation, Timeline, Timer, utils } from "animejs";

import { PubSub, type Subscribed } from "./deps/pubsub";
import { initMedias } from "./deps/init-medias";
import { createScene } from "./deps/create-scene";
import { createElements } from "./deps/create-elements";
import { mixClassNames, setStaticChanges } from "./deps/static-changes";
import { restoreNodeFromInitial } from "./deps/initial-state";
import { P } from "./types";
import { getAbsoluteCoords, getTransform, isChangeActiveAtTime } from "./deps/utils";
import { DEFAULT_DURATION } from "../config/constants";
import { SCENE_ID } from "@/scene-runtime/constants";

function isAutoMove(move: unknown): move is { mode: "auto"; clearTransforms?: boolean } {
	return Boolean(move && typeof move == "object" && (move as any).mode === "auto");
}

function areRectsClose(
	a: { x: number; y: number; width: number; height: number },
	b: { x: number; y: number; width: number; height: number },
	epsilon = 0.75
): boolean {
	return (
		Math.abs(a.x - b.x) <= epsilon &&
		Math.abs(a.y - b.y) <= epsilon &&
		Math.abs(a.width - b.width) <= epsilon &&
		Math.abs(a.height - b.height) <= epsilon
	);
}

function resolveTransitionEndAtTime(change: Change): number {
	const curr = typeof change.curr === "number" && Number.isFinite(change.curr) ? change.curr : 0;
	const defaultEnd = curr + DEFAULT_DURATION;
	if (typeof change.next === "number" && Number.isFinite(change.next) && change.next > curr) {
		return Math.min(change.next, defaultEnd);
	}
	return defaultEnd;
}

function resolveChangeProgressAtTime(currentTime: number, change: Change): number {
	const curr = typeof change.curr === "number" && Number.isFinite(change.curr) ? change.curr : 0;
	const end = resolveTransitionEndAtTime(change);
	if (end <= curr) return 1;
	return Math.max(0, Math.min(1, (currentTime - curr) / (end - curr)));
}

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
	toggleMute: () => boolean;
	setMuted: (muted: boolean) => boolean;
	readonly duration: number;
	readonly paused: boolean;
	readonly muted: boolean;

	subscribe: (up: Subscribed<Timeline>) => () => void;
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
	onTimelineUpdate?: (self: Timeline, duration: number) => void;
	isMuted = false;

	private updateRuntime = {
		persoPositions: new Map<ID, Change>(),
		transitions: new Map<Change, JSAnimation>(),
		setters: new Map<ID, JSAnimation>(),
		previousTime: null as number | null
	};
	private initialParentById = new Map<ID, HTMLElement | null>();

	// Stocker les dimensions de fin de la dernière transition pour la prochaine transition
	private lastEndCoords = new Map<ID, { x: number; y: number; width: number; height: number }>();

	telco: TelcoProps;

	constructor({
		render,
		persos,
		eventtimes,
		onEnd,
		onTimelineUpdate
	}: {
		render: HTMLElement | null;
		persos: Map<ID, Perso>;
		eventtimes: MapEvent;
		onEnd?: (tm: Timer) => void;
		onTimelineUpdate?: (self: Timeline, duration: number) => void;
	}) {
		if (!render) throw new Error("Le player ne peut etre rendu.");
		this.render = render;
		this.persos = persos;
		this.eventtimes = eventtimes;
		if (typeof onEnd === "function") this.onEnd = onEnd;
		if (typeof onTimelineUpdate === "function") this.onTimelineUpdate = onTimelineUpdate;
		this.createElements = createElements.bind(this);
		this.initMedias = initMedias.bind(this);
		this.setStaticChanges = setStaticChanges.bind(this);
		this.createScene = createScene.bind(this);
		this.onBeforeUpdateTM = this.onBeforeUpdateTM.bind(this);

		this.init();
	}

	private init() {
		this.timeLine = createTimeline(tmDefaults);
		this.createElements();
		this.captureInitialParents();
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

	private captureInitialParents() {
		this.persos.forEach((perso) => {
			const node = this.$elements.get(perso.initial.id);
			this.initialParentById.set(perso.initial.id, (node?.parentElement as HTMLElement | null) ?? null);
		});
	}

	private onBeforeUpdateTM() {
		this.timeLine.onBeforeUpdate = (self: Timeline) => {
			this.updatesTM.forEach((up) => up(self));
			this.onTimelineUpdate?.(self, this.timeLine.duration || 0);
		};
	}

	private initTelco = () => {
		console.log("INIT TELCO");

		const duration = () => this.timeLine.duration;
		const paused = () => this.timeLine.paused;
		const muted = () => this.isMuted;
		this.telco = {
			seek: this.seek,
			pause: this.pause,
			play: this.play,
			replay: this.replay,
			revert: this.revert,
			toggleMute: this.toggleMute,
			setMuted: this.setMuted,
			get duration() {
				return duration();
			},
			get paused() {
				return paused();
			},
			get muted() {
				return muted();
			},
			subscribe: (up: Subscribed<Timeline>) => this.updatesTM.subscribe(up)
		};
	};

	private toggleMute = () => {
		return this.setMuted(!this.isMuted);
	};

	private setMuted = (muted: boolean) => {
		const root = this.$elements.get(SCENE_ID) ?? this.render;
		const mediaNodes = root ? Array.from(root.querySelectorAll("video, audio")) : [];
		mediaNodes.forEach((node) => {
			const media = node as HTMLMediaElement;
			if (muted) {
				media.setAttribute("muted", "muted");
				media.muted = true;
				return;
			}
			media.removeAttribute("muted");
			media.muted = false;
		});
		this.isMuted = muted;
		return this.isMuted;
	};

	private play = () => {
		if (this.timeLine.paused) {
			this.timeLine.play();
			this.mediaStatus.forEach((ms) => {
				this.executeMediaAction(ms.node, ms.status, { force: true });
			});
		}
		return this.timeLine;
	};

	private replay = () => {
		this.seekToTime(0, "replay");
		this.play();
		return this.timeLine;
	};
	private pause = () => {
		this.timeLine.pause();
		this.mediaStatus.forEach((ms) => {
			this.executeMediaAction(ms.node, "pause", { force: true });
		});
		return this.timeLine;
	};

	private revert = () => {
		this.seekToTime(0, "revert");
		return this.timeLine;
	};

	private seek = (time: number) => {
		this.seekToTime(time, "seek");
		return this.timeLine;
	};

	private seekToTime(time: number, reason: "seek" | "replay" | "revert") {
		this.timeLine.pause();
		this.mediaStatus.forEach((ms) => {
			ms.node.pause();
		});
		this.resetUpdateRuntimeState(reason);
		this.lastEndCoords.clear();
		this.clearChangeSnapshots();
		this.clearTransientMoveInlineStyles();
		this.restoreInitialNodeStates();
		this.seekChanges(time);

		this.timeLine.seek(+time);
		this.seekMedias(+time);
	}

	private seekMedias = (time: number) => {
		this.mediaStatus.forEach((ms) => {
			const $node = ms.node as HTMLVideoElement;
			const currentTimeMs = resolveMediaTimeAtSeek(ms, time);
			const clampedTimeSec = clampMediaTimeSec($node, currentTimeMs / 1000);
			$node.currentTime = clampedTimeSec;
		});
	};

	private clearChangeSnapshots() {
		this.persoChanges.forEach((changes) => {
			Object.values(changes).forEach((change) => {
				if (change && typeof change == "object" && "snapshot" in change) {
					delete change.snapshot;
				}
			});
		});
	}

	getUpdateRuntimeState() {
		return this.updateRuntime;
	}

	private resetUpdateRuntimeState(_reason: "seek" | "replay" | "revert") {
		const runtime = this.updateRuntime;

		for (const setter of runtime.setters.values()) {
			setter.revert();
		}

		runtime.persoPositions.clear();
		runtime.transitions.clear();
		runtime.setters.clear();
		runtime.previousTime = null;
	}

	private clearTransientMoveInlineStyles() {
		this.$elements.forEach(($el) => {
			$el.style.removeProperty("width");
			$el.style.removeProperty("height");
			$el.style.removeProperty("transform");
			$el.style.removeProperty("transform-origin");
			$el.style.removeProperty("rotate");
			$el.style.removeProperty("scale");
			$el.style.removeProperty("scaleX");
			$el.style.removeProperty("scaleY");
			$el.style.removeProperty("originX");
			$el.style.removeProperty("originY");
		});
	}

	private restoreInitialNodeStates() {
		for (const perso of this.persos.values()) {
			const initial = perso.initial;
			const $el = this.$elements.get(initial.id);
			if (!$el) continue;
			restoreNodeFromInitial({
				node: $el,
				initial,
				resolveParentById: (id) => this.$elements.get(id) ?? null,
				resolveDefaultParent: () => this.initialParentById.get(initial.id) ?? null
			});
		}
	}

	private seekChanges(time: number) {
		const runtime = this.updateRuntime;

		this.persoChanges.forEach((pcs, id) => {
			const entries = Object.entries(pcs)
				.map(([position, change]) => ({ position: Number(position), change }))
				.filter((entry) => Number.isFinite(entry.position))
				.sort((a, b) => a.position - b.position);
			if (!entries.length) return;

			const activeChange =
				entries.find((entry) => {
					const normalizedEntry: Change = {
						...entry.change,
						curr:
							typeof entry.change.curr === "number" && Number.isFinite(entry.change.curr)
								? entry.change.curr
								: entry.position,
						next:
							typeof entry.change.next === "number" && Number.isFinite(entry.change.next)
								? entry.change.next
								: Infinity
					};
					return isChangeActiveAtTime(time, normalizedEntry);
				})?.change || entries[entries.length - 1].change;

			const activeCurr =
				typeof activeChange.curr === "number" && Number.isFinite(activeChange.curr) ? activeChange.curr : 0;

			const baselineChanges: Array<Partial<ActionAtributes>> = [];
			let lastParentMove: ID | null = null;
			for (const entry of entries) {
				const curr =
					typeof entry.change.curr === "number" && Number.isFinite(entry.change.curr)
						? entry.change.curr
						: entry.position;
				if (curr >= activeCurr) break;
				baselineChanges.push(entry.change.change);
				if (typeof entry.change.change.move === "string") {
					lastParentMove = entry.change.change.move;
				}
			}

			const baseline = baselineChanges.reduce(
				(acc, current) => ({ ...acc, ...current }),
				{} as Partial<ActionAtributes>
			);

			if (lastParentMove) {
				const $el = this.$elements.get(id);
				const $parent = this.$elements.get(lastParentMove);
				if ($el && $parent && $el.parentElement !== $parent) {
					$parent.appendChild($el);
				}
			}

			if (typeof baseline.move === "string") {
				this._moveChange(id, baseline);
			} else if (baseline.move !== true && !isAutoMove(baseline.move)) {
				this._moveChange(id, baseline);
			}
			this._applyChanges(id, baseline);
			if (Object.keys(baseline).length) {
				this.applyMediaChanges(time, id, baseline, true);
			}

			const activePatch = activeChange.change;
			if (time >= activeCurr) {
				if ((typeof activePatch.move === "boolean" && activePatch.move) || isAutoMove(activePatch.move)) {
					const transition = this._moveChange(id, activePatch);
					if (transition) {
						runtime.transitions.set(activeChange, transition);
						transition.progress = resolveChangeProgressAtTime(time, activeChange);
					}
				} else if (typeof activePatch.move === "string") {
					this._moveChange(id, activePatch);
					this._applyChanges(id, activePatch);
				} else {
					this._applyChanges(id, activePatch);
				}

				this.applyMediaChanges(time, id, activePatch, true);
			}

			runtime.persoPositions.set(id, activeChange);
		});

		runtime.previousTime = time;
	}

	_applyChanges(id: ID, change: Partial<ActionAtributes>) {
		const $el = this.$elements.get(id);

		if (change.className) {
			$el.className =
				typeof change.className === "string"
					? mixClassNames(change.className)
					: mixClassNames($el.className || "", change.className);
		}
		if (change.content) {
			$el.textContent = change.content;
		}
		if (change.attr) {
			Object.entries(change.attr).forEach(([key, value]) => $el.setAttribute(key, value));
		}
	}

	_moveChange(id: ID, change: Partial<ActionAtributes>): JSAnimation | undefined {
		const $el = this.$elements.get(id);
		if (!$el) return undefined;

		switch (typeof change.move) {
			case "undefined": {
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

				return this._createMoveTransition($el, old, nex, px, py, undefined);
			}
			case "object": {
				if (!isAutoMove(change.move)) break;

				// Utiliser les dimensions de fin de la dernière transition si disponibles
				const lastEndCoords = this.lastEndCoords.get(id);
				const canUseLastEndCoords = true;
				const oldRectFromDom = getAbsoluteCoords($el);
				const canUseCachedRect =
					Boolean(canUseLastEndCoords && lastEndCoords) &&
					areRectsClose(oldRectFromDom, lastEndCoords as { x: number; y: number; width: number; height: number });

				// Si on a des dimensions de la transition précédente, les utiliser pour "old"
				// Sinon mesurer normalement
				const old =
					canUseCachedRect && lastEndCoords
						? { x: lastEndCoords.x, y: lastEndCoords.y, width: lastEndCoords.width, height: lastEndCoords.height }
						: oldRectFromDom;
				if (!canUseCachedRect && lastEndCoords) {
					this.lastEndCoords.delete(id);
				}

				this._applyChanges(id, change);
				const nex = getAbsoluteCoords($el);

				const px = Number(utils.get($el, "x", false));
				const py = Number(utils.get($el, "y", false));

				return this._createMoveTransition($el, old, nex, px, py, change.move);
			}
			default:
				break;
		}
	}

	private _createMoveTransition(
		$el: HTMLElement,
		old: ReturnType<typeof getAbsoluteCoords>,
		nex: ReturnType<typeof getAbsoluteCoords>,
		px: number,
		py: number,
		moveOptions?: { mode: "auto"; clearTransforms?: boolean }
	): JSAnimation | undefined {
		const dx = old.x - nex.x;
		const dy = old.y - nex.y;
		if (dx === 0 && dy === 0 && old.width === nex.width && old.height === nex.height) {
			return undefined;
		}

		const diff = getTransform($el).translate(-px, -py).invertSelf().transformPoint(new DOMPoint(dx, dy));

		const animationParams: Parameters<typeof animate>[1] = {
			x: { from: diff.x + px, to: 0 + px },
			y: { from: diff.y + py, to: 0 + py },
			width: { from: old.width, to: nex.width },
			height: { from: old.height, to: nex.height },
			autoplay: false,
			duration: DEFAULT_DURATION,
			composition: "merge"
		};
		if (moveOptions?.clearTransforms) {
			animationParams.rotate = { from: Number(utils.get($el, "rotate", false)), to: 0 };
			animationParams.scaleX = { from: Number(utils.get($el, "scaleX", false)), to: 1 };
			animationParams.scaleY = { from: Number(utils.get($el, "scaleY", false)), to: 1 };
			animationParams.originX = { from: Number(utils.get($el, "originX", false)), to: 0.5 };
			animationParams.originY = { from: Number(utils.get($el, "originY", false)), to: 0.5 };
		}

		const animation = animate($el, animationParams);

		// Stocker les dimensions de fin dans lastEndCoords pour la prochaine transition
		this.lastEndCoords.set($el.id, { x: nex.x, y: nex.y, width: nex.width, height: nex.height });

		return animation;
	}

	// changes : src, media
	applyMediaChanges(time: number, id: ID, change: Partial<ActionAtributes>, duringSeek = false) {
		const perso = this.persos.get(id);
		if (!("media" in perso)) return;
		const mediaStatus = this.mediaStatus.get(perso.initial.id);
		if (!mediaStatus) return;

		const $el = this.$elements.get(id);
		if (change.src) {
			const $mediaEl = $el as HTMLAudioElement | HTMLVideoElement | HTMLImageElement;
			const nextHref = new URL(String(change.src), window.location.href).href;
			if ($mediaEl.src !== nextHref) {
				$mediaEl.src = change.src;
			}
		}

		if (perso.type == P.VIDEO && change.media) {
			const changeAt = Number(change.media.changeAt);
			const offset = Number(change.media.offset);
			const normalizedChangeAt = Number.isFinite(changeAt) && changeAt >= 0 ? changeAt : 0;
			const normalizedOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;

			mediaStatus.change = {
				changeAt: normalizedChangeAt,
				offset: normalizedOffset
			};
			mediaStatus.startAt = normalizedChangeAt - normalizedOffset;
			mediaStatus.status = change.media.action == "pause" ? "pause" : "play";

			if (duringSeek) {
				return;
			}

			this.executeMediaAction(mediaStatus.node, change.media.action, {
				offsetMs: normalizedOffset,
				force: false
			});
		}
	}

	private executeMediaAction(
		node: HTMLMediaElement,
		action: string,
		options?: { offsetMs?: number; force?: boolean }
	) {
		switch (action) {
			case "play": {
				if (typeof options?.offsetMs == "number" && Number.isFinite(options.offsetMs)) {
					node.currentTime = Math.max(0, options.offsetMs) / 1000;
				}
				if (options?.force || !this.timeLine.paused) {
					node.play();
				}
				break;
			}
			case "pause": {
				node.pause();
				break;
			}
			default:
				break;
		}
	}

	getNodeByNodeId(nodeId: string | null | undefined): HTMLElement | null {
		if (!nodeId) return null;
		return this.$elements.get(nodeId) ?? null;
	}
}

function resolveMediaTimeAtSeek(status: MediaStatus, timeMs: number): number {
	if (status.change) {
		if (status.status === "pause") return Math.max(0, status.change.offset);
		return Math.max(0, status.change.offset + (timeMs - status.change.changeAt));
	}

	if (status.startAt <= timeMs) return Math.max(0, timeMs - status.startAt);
	return 0;
}

function clampMediaTimeSec(node: HTMLMediaElement, timeSec: number): number {
	if (!Number.isFinite(timeSec) || timeSec < 0) return 0;
	if (Number.isFinite(node.duration) && node.duration > 0) {
		return Math.min(timeSec, node.duration);
	}
	return timeSec;
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
