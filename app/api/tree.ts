import type { Route } from "../+types/root";
import {
	createCapsuleItem,
	createItemFromExistingContent,
	createTextItemInCapsule,
	deleteCapsuleBranch,
	deleteItemOnly
} from "./db";

type TreeMutationBody =
	| {
			action: "create-text";
			capsuleId: number;
			afterItemId?: number;
			name?: string;
			inner?: string;
	  }
	| {
			action: "create-capsule";
			sceneId: number;
			destinationCapsuleId: number;
			afterItemId?: number;
			capsuleName?: string;
	  }
	| {
			action: "create-from-content";
			contentId: number;
			capsuleId: number;
			afterItemId?: number;
	  }
	| {
			action: "delete-item";
			itemId: number;
	  }
	| {
			action: "delete-capsule";
			itemId: number;
			capsuleId: number;
	  };

export async function action({ request }: Route.ActionArgs) {
	const body = (await request.json()) as TreeMutationBody;

	if (body.action === "create-text") {
		const created = await createTextItemInCapsule({
			capsuleId: Number(body.capsuleId),
			afterItemId: body.afterItemId ? Number(body.afterItemId) : undefined,
			name: body.name,
			inner: body.inner
		});
		return Response.json({ ok: true, action: body.action, created });
	}

	if (body.action === "create-capsule") {
		const created = await createCapsuleItem({
			sceneId: Number(body.sceneId),
			destinationCapsuleId: Number(body.destinationCapsuleId),
			afterItemId: body.afterItemId ? Number(body.afterItemId) : undefined,
			capsuleName: body.capsuleName
		});
		return Response.json({ ok: true, action: body.action, created });
	}

	if (body.action === "create-from-content") {
		const created = await createItemFromExistingContent({
			contentId: Number(body.contentId),
			capsuleId: Number(body.capsuleId),
			afterItemId: body.afterItemId ? Number(body.afterItemId) : undefined
		});
		return Response.json({ ok: true, action: body.action, created });
	}

	if (body.action === "delete-item") {
		const deleted = await deleteItemOnly(Number(body.itemId));
		return Response.json({ ok: true, action: body.action, deleted });
	}

	if (body.action === "delete-capsule") {
		const deletedCapsule = await deleteCapsuleBranch({
			itemId: Number(body.itemId),
			capsuleId: Number(body.capsuleId)
		});
		return Response.json({ ok: true, action: body.action, deletedCapsule });
	}

	return Response.json({ ok: false, message: "Unsupported tree action" }, { status: 400 });
}
