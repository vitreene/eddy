import { createTimeline, Timeline, Timer } from "animejs";

import { PubSub, type Subscribed } from "./deps/pubsub";
import { initMedias } from "./deps/init-medias";
import { createScene } from "./deps/create-scene";
import { onUpdateTimeLine } from "./deps/on-update";
import { createElements } from "./deps/create-elements";
import { setStaticChanges } from "./deps/static-changes";

import type { Change } from "./deps/static-changes";
import type { ID, MapEvent, MediaStatus, Perso } from "./types";

const tmDefaults = {
	autoplay: true,
	// loop: 1,
	// alternate: true,
	onLoop: () => console.log("///////LOOP")
};

export class Player {
	static _instance: Player | null = null;

	timeLine!: Timeline;
	eventtimes!: MapEvent;
	render!: HTMLElement;
	$elements = new Map<ID, HTMLElement>();
	mediaStatus = new Map<ID, MediaStatus>();
	persos = new Map<ID, Perso>();
	persoChanges = new Map<ID, Record<number, Change>>();
	updatesTM = new PubSub<Timeline>();
	onEnd: (tm: Timer) => void = () => {};

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

		if (Player._instance) {
			return Player._instance;
		}
		Player._instance = this;
		this.render = render;
		this.persos = persos;
		this.eventtimes = eventtimes;
		if (typeof onEnd === "function") this.onEnd = onEnd;
		this.createElements = createElements.bind(this);
		this.initMedias = initMedias.bind(this);
		this.setStaticChanges = setStaticChanges.bind(this);
		this.createScene = createScene.bind(this);
		this.onUpdateTM = this.onUpdateTM.bind(this);

		this.init();
	}

	private init() {
		this.timeLine = createTimeline(tmDefaults);
		this.createElements();
		this.initMedias();
		this.setStaticChanges();
		this.createScene();
		this.onUpdateTM();
		const onUpdate = onUpdateTimeLine.bind(this)();
		this.updatesTM.subscribe(onUpdate);
		console.log(this);
	}

	private onUpdateTM() {
		this.timeLine.onUpdate = (self: Timeline) => this.updatesTM.forEach((up) => up(self));
	}
	private createElements!: () => void;
	private initMedias!: () => void;
	private setStaticChanges!: () => void;
	private createScene!: () => void;

	telco = () => {
		return {
			seek: this.seek,
			pause: this.pause,
			play: this.play,
			replay: this.replay,
			duration: this.timeLine.duration,
			paused: this.timeLine.paused,
			susbscribe: (up: Subscribed<Timeline>) => this.updatesTM.subscribe(up)
		};
	};

	private play = () => {
		this.timeLine.play();
		this.mediaStatus.forEach((ms) => {
			ms.node[ms.status]();
		});
		return this.timeLine;
	};

	private replay = () => {
		this.timeLine.restart();
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

	private seek = (time: number) => {
		this.timeLine.pause();
		this.timeLine.seek(time);
		this.seekMedias(time);

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
}

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
