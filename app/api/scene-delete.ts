import { redirect } from "react-router";
import type { Route } from "../+types/root";
import { deleteScene } from "./db";

export async function action({ request, params }: Route.ActionArgs) {
	const sceneId = Number(params.id);
	if (!Number.isFinite(sceneId)) {
		return Response.json({ ok: false, message: "Invalid scene id" }, { status: 400 });
	}

	const formData = await request.formData();
	const keepTexts = formData.get("keepTexts") === "on";

	const result = await deleteScene(sceneId, { keepTexts });
	const accept = request.headers.get("accept") || "";
	if (accept.includes("application/json")) {
		return Response.json({ ok: true, ...result });
	}

	return redirect("/");
}
