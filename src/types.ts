// import { AnimationParams } from 'animejs';
import gsap from 'gsap';
import * as CSS from 'csstype';

export type ID = string;
export type MapEvent = Map<number, Eventime | Eventime[]>;

export interface Eventime {
	name: string;
	// startAt: number;
	data?: any;
	duration?: number;
	events?: Eventime[];
}

interface CSSTransformSpecialParam<T> {
	x: number;
	y: T;
	dx: T;
	dy: T;
	movex: T;
	movey: T;
}

export interface Perso {
	type: PersoType;
	initial: Initial;
	actions: Record<string, Partial<Action>>;
}
export interface Style
	extends CSS.Properties<string | number>,
		CSS.PropertiesHyphen<string | number>,
		Partial<CSSTransformSpecialParam<number>> {}

export interface ClassAction {
	add?: string;
	remove?: string;
}

export interface Action {
	attr: any;
	style: gsap.TweenVars;
	className: string | ClassAction;
	move: boolean | string;
	content: string;
}

export interface Initial extends Partial<Action> {
	tag?: string;
	id: string;
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
} as const;

export const P = persoTypes;

export type PersoType = keyof typeof persoTypes;
