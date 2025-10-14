import type * as CSS from 'csstype';
import type { AnimationParams } from 'animejs';
import type { AnimationItem } from 'lottie-web';

export type ID = string | number;
export type MapEvent = Map<number, Eventime | Eventime[]>;

export interface Eventime {
	name: string;
	// startAt: number;
	data?: any;
	duration?: number;
	events?: Eventime[];
}

interface PersoBase {
	initial: Initial;
	actions: Record<string, Partial<Action>>;
}

export interface PersoDef extends PersoBase {
	type: PersoType;
}

export interface PersoImgDef extends PersoBase {
	type: typeof persoTypes.IMG | typeof persoTypes.SPRITE;
	initial: Initial & { src: string };
	media?: Record<string, Img>;
}
export interface PersoMediaDef extends PersoBase {
	type: typeof persoTypes.LOTTIE | typeof persoTypes.VIDEO;
	initial: Initial & { src: string };
	media?: any;
	actions: Record<string, Partial<Action & { media: Media }>>;
}

export interface PersoLottieDef extends PersoMediaDef {
	type: typeof persoTypes.LOTTIE;
	initial: Initial & { src: string };
	media: AnimationItem;
	actions: Record<string, Partial<Action & { media: Media }>>;
}
export interface PersoVideoDef extends PersoMediaDef {
	type: typeof persoTypes.VIDEO;
	initial: Initial & { src: string; master: boolean };
	media: any;
	actions: Record<string, Partial<Action & { media: Media }>>;
}

export type Perso = PersoDef | PersoImgDef | PersoMediaDef;

export interface Img {
	img?: HTMLImageElement;
	src: string;
	fit?: string;
	ratio?: number;
	width?: number | string;
	height?: number | string;
}

export interface Media {
	action: 'play' | 'pause'; //string;
	duration?: number;
	changeAt?: number;
	offset?: number;
}

export interface MediaStatus {
	node: HTMLVideoElement;
	status: 'play' | 'pause';
	startAt: number;
	change?: {
		changeAt: number;
		offset: number;
	};
}

export interface Style
	extends CSS.Properties<string | number>,
		CSS.PropertiesHyphen<string | number>,
		Partial<CSSTransformSpecialParam<number>> {}

interface CSSTransformSpecialParam<T> {
	x: number;
	y: T;
	dx: T;
	dy: T;
	movex: T;
	movey: T;
}

export interface ClassNameAction {
	add?: string;
	remove?: string;
}

export interface ActionCat {
	attr: any;
	style: AnimationParams;
	className: string | ClassNameAction;
	move: boolean | string;
	content: string;
	src: string;
	media: Media;
}

export type Action = Partial<ActionCat> | boolean;

export interface Initial extends Partial<ActionCat> {
	tag?: string;
	id: string | number;
}

export const persoTypes = {
	TEXT: 'TEXT',
	IMG: 'IMG',
	LIST: 'LIST',
	BLOC: 'BLOC',
	ROOT: 'ROOT',
	VIDEO: 'VIDEO',
	PROTO: 'PROTO',
	LAYER: 'LAYER',
	SPRITE: 'SPRITE',
	BUTTON: 'BUTTON',
	POLYGON: 'POLYGON',
	SOUND: 'SOUND',
	AUDIO: 'AUDIO',
	LOTTIE: 'LOTTIE',
	THREE: 'THREE',
} as const;

export const P = persoTypes;

export type PersoType = keyof typeof persoTypes;

export interface My extends MediaElementAudioSourceNode {
	my?: {
		connect: () => void;
		disconnect: () => void;
	};
}
