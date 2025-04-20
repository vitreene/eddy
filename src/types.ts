import { AnimationParams } from 'animejs';
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

export interface Style
	extends CSS.Properties<string | number>,
		CSS.PropertiesHyphen<string | number>,
		Partial<CSSTransformSpecialParam<number>> {}

export interface Initial {
	tag: string;
	id: string;
	attr: any;
	style: AnimationParams;
	// classStyle: Style;
	className: string;
	move: string;
	content: string;
}

export const persoTypes = {
	TEXT: 'text',
	IMG: 'img',
	LIST: 'list',
	BLOC: 'bloc',
	ROOT: 'root',
	VIDEO: 'video',
	PROTO: 'proto',
	LAYER: 'layer',
	SPRITE: 'sprite',
	BUTTON: 'button',
	POLYGON: 'polygon',
	SOUND: 'sound',
	AUDIO: 'audio',
} as const;

export const P = persoTypes;

export type PersoType = keyof typeof persoTypes;
