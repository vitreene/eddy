import type { Content, Decor, SceneComp } from "@/api/db";

export interface TreeCreateEvent {
	destinationCapsuleId?: number;
	afterItemId?: number;
	contentId?: number;
	name?: string;
	inner?: string;
	grid?: string;
	capsuleName?: string;
}

export interface TreeDeleteEvent {
	itemId: number;
	capsuleId?: number;
}

export type SceneTreeContext = SceneComp & {
	active: ActiveState;
};

export type TreeMutationResponse = {
	action: "create-text" | "create-capsule" | "create-from-content" | "delete-item" | "delete-capsule";
	created?: {
		item?: {
			id: number;
			order: number;
			contentId: number;
			capsuleId: number;
			decorId: number | null;
			visible: boolean;
		};
		content?: Content;
		decor?: Decor;
		capsule?: {
			id: number;
			name: string;
			type: string | null;
			grid: string | null;
			itemDurationMode?: string;
			itemDurationSec?: number | null;
			profil?: string | null;
		};
	};
	deleted?: { id: number; order: number; contentId: number; capsuleId: number };
	deletedCapsule?: {
		capsuleIds: number[];
		itemIds: number[];
		contentIds: number[];
		decorIds: number[];
		eventItemIds: number[];
	};
};

export interface ActiveState {
	[key: string]: number | string | boolean | null;
	main: number | null;

	itemId: number | null;
	contentId: number | null;
	cue: number | null;
	progress: number | null;
	action: string | null;
	event: string | null;
	eventTouched: boolean;
	decorTouched: boolean;
	themeTouched: boolean;
}

export interface TreeMoveEvent {
	sourceId: number;
	targetId?: number;
	targetCapsuleId?: number;
	insertionIndex?: number;
}
