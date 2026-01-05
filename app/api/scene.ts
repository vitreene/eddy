import { redirect } from "react-router";
import type { Route } from "../+types/root";

import { createScene } from "./db";

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const data = Object.fromEntries(formData) as { title: string };
	const scene = await createScene(data.title);
	if (scene) return redirect(`/scene/${scene.id}`);
	return { ok: false };
}
//
