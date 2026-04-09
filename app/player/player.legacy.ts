import { createTimeline, Timeline, Timer } from "animejs";

import { PubSub, type Subscribed } from "./deps/pubsub";
import { initMedias } from "./deps/init-medias";
import { createScene } from "./deps/create-scene";
import { createElements } from "./deps/create-elements";
import { setStaticChanges } from "./deps/static-changes";
import { onUpdateTimeLineLegacy } from "./deps/on-update.legacy";
import { SCENE_ID } from "@/scene-runtime/constants";

import type { Change } from "./deps/static-changes";
import type { ID, MapEvent, MediaStatus, Perso } from "./types";
import type { TelcoProps } from "./player";

const tmDefaults = {
	onLoop: () => console.log("///////LOOP")
};

export class PlayerLegacy {
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

	telco!: TelcoProps;

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

		this.init();
	}

	private init() {
		this.timeLine = createTimeline(tmDefaults);
		(createElements as any).call(this);
		(initMedias as any).call(this);
		(setStaticChanges as any).call(this);
		(createScene as any).call(this);
		this.onBeforeUpdateTM();
		const onUpdate = onUpdateTimeLineLegacy.bind(this)();
		this.updatesTM.subscribe(onUpdate);
		this.initTelco();
	}

	private onBeforeUpdateTM() {
		this.timeLine.onBeforeUpdate = (self: Timeline) => {
			this.updatesTM.forEach((up) => up(self));
			this.onTimelineUpdate?.(self, this.timeLine.duration || 0);
		};
	}

	private initTelco = () => {
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

	private toggleMute = () => this.setMuted(!this.isMuted);

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
				if (ms.status === "play") void ms.node.play();
				else ms.node.pause();
			});
		}
		return this.timeLine;
	};

	private pause = () => {
		this.timeLine.pause();
		this.mediaStatus.forEach((ms) => ms.node.pause());
		return this.timeLine;
	};

	private seek = (time: number) => {
		this.timeLine.pause();
		this.timeLine.seek(+time);
		this.mediaStatus.forEach((ms) => {
			const $node = ms.node as HTMLVideoElement;
			const currentTimeMs = ms.change
				? ms.change.offset + (time - ms.change.changeAt)
				: ms.startAt <= time
					? time - ms.startAt
					: 0;
			$node.currentTime = Math.max(0, currentTimeMs) / 1000;
		});
		return this.timeLine;
	};

	private replay = () => {
		this.seek(0);
		this.play();
		return this.timeLine;
	};

	private revert = () => {
		this.pause();
		this.timeLine.revert();
		this.mediaStatus.forEach((ms) => {
			ms.node.currentTime = 0;
			ms.status = "pause";
		});
		return this.timeLine;
	};

	applyMediaChanges(time: number, id: ID, change: any) {
		const perso = this.persos.get(id);
		if (!perso || !("media" in perso)) return;
		const mediaStatus = this.mediaStatus.get(perso.initial.id);
		if (!mediaStatus) return;

		if (perso.type === "VIDEO" && change.media) {
			mediaStatus.change = {
				changeAt: Number(change.media.changeAt) || 0,
				offset: Number(change.media.offset) || 0
			};
			mediaStatus.startAt = time;
			mediaStatus.status = change.media.action === "pause" ? "pause" : "play";
		}
	}

	getNodeByNodeId(nodeId: string | null | undefined): HTMLElement | null {
		if (!nodeId) return null;
		return this.$elements.get(nodeId) ?? null;
	}
}
