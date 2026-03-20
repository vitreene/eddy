import type { Decor, SceneComp } from "@/api/db";

import { createDecorOnServer } from "./scene-logic.api";

type DecorSeed = {
	className?: string | null;
	area?: string | null;
	style?: Decor["style"] | null;
};

const pendingDecorCreation = new Map<string, Promise<number | null>>();

export async function ensureEventDecorId(args: {
	context: SceneComp;
	itemId: number;
	action: string;
	seed?: DecorSeed;
}): Promise<{ decorId: number | null; createdDecor: Decor | null }> {
	const existingDecorId = args.context.events[args.itemId]?.[args.action]?.decorId;
	if (typeof existingDecorId == "number" && Number.isFinite(existingDecorId)) {
		return { decorId: existingDecorId, createdDecor: null };
	}

	const key = `${args.itemId}:${args.action}`;
	let creationPromise = pendingDecorCreation.get(key);
	let isPromiseOwner = false;

	if (!creationPromise) {
		isPromiseOwner = true;
		creationPromise = createDecorOnServer().catch((): number | null => null);
		pendingDecorCreation.set(key, creationPromise);
	}

	let decorId: number | null = null;
	try {
		decorId = await creationPromise;
	} finally {
		if (isPromiseOwner) pendingDecorCreation.delete(key);
	}

	if (!decorId) return { decorId: null, createdDecor: null };
	if (!isPromiseOwner) return { decorId, createdDecor: null };

	return {
		decorId,
		createdDecor: {
			id: decorId,
			name: null,
			className: args.seed?.className ?? null,
			area: args.seed?.area ?? null,
			style: args.seed?.style ?? {},
			itemTargetId: null,
			basedUpon: null
		}
	};
}
