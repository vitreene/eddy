import type { Content, Decor, SceneComp } from "@/api/db";
import type { OrientationMode } from "@/config/orientation";

export type ItemEditTab = "presets" | "layout" | "advanced";

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
	[key: string]: number | string | boolean | HTMLElement | null;
	main: number | null;

	itemId: number | null;
	node: HTMLElement | null;
	contentId: number | null;
	cue: number | null;
	progress: number | null;
	action: string | null;
	event: string | null;
	sequenceTouched: boolean;
	sequenceFlushToken: number;
	sequenceFlushReason: string | null;
	telcoMuted: boolean;
	previewOrientation: OrientationMode;
	itemEditTab: ItemEditTab;
	eventTouched: boolean;
	decorTouched: boolean;
	themeTouched: boolean;
	capsuleTouched: boolean;
}

export interface TreeMoveEvent {
	sourceId: number;
	targetId?: number;
	targetCapsuleId?: number;
	insertionIndex?: number;
}
