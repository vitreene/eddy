import { createTimeline, Timeline } from 'animejs';
import { ID, MapEvent, Perso } from '../types';
import { Change } from './deps/static-changes';
import { createElements } from './deps/create-elements';
import { initMedias } from './deps/init-medias';
import { setStaticChanges } from './deps/static-changes';
import { createScene } from './deps/create-scene';
import { onUpdateTimeLine } from './deps/on-update';
import { createTelco } from './deps/telco';

const tmDefaults = {
	autoplay: true,
	loop: 1,
	alternate: true,
	onLoop: () => console.log('///////LOOP'),
};

export class Player {
	timeLine: Timeline;
	eventtimes: MapEvent;
	render: HTMLElement;
	$elements = new Map<ID, HTMLElement>();
	persos = new Map<ID, Perso>();
	persoChanges = new Map<ID, Record<number, Change>>();

	constructor({
		render,
		persos,
		eventtimes,
	}: {
		render: HTMLElement;
		persos: Map<ID, Perso>;
		eventtimes: MapEvent;
	}) {
		if (this.render) return this;
		this.render = render;
		this.persos = persos;
		this.eventtimes = eventtimes;
		this.createElements = createElements.bind(this);
		this.initMedias = initMedias.bind(this);
		this.setStaticChanges = setStaticChanges.bind(this);
		this.createScene = createScene.bind(this);
		this.onUpdateTimeLine = onUpdateTimeLine.bind(this);
		this.init();
	}

	private init() {
		this.timeLine = createTimeline(tmDefaults);
		this.createElements();
		this.initMedias();
		this.setStaticChanges();
		this.createScene();
		this.updates();
	}

	private updates() {
		const updates = [createTelco(this.timeLine), this.onUpdateTimeLine()];
		this.timeLine.onUpdate = (self: Timeline) =>
			updates.forEach((up) => up(self));
	}
	private createElements: () => void;
	private initMedias: () => void;
	private setStaticChanges: () => void;
	private createScene: () => void;
	private onUpdateTimeLine: () => (self: Timeline) => boolean;
}
