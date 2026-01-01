// lib.types.ts
export type Pt = { x: number; y: number };

export type ElementTransform = {
	x: number;
	y: number;
	width: number;
	height: number;
	rotation: number; // deg
	originX: number; // 0..1
	originY: number; // 0..1
	scaleX: number;
	scaleY: number;
};

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export type Affine2D = { a: number; b: number; c: number; d: number; tx: number; ty: number };
