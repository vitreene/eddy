import { index, route, prefix } from "@react-router/dev/routes";
import type { RouteConfig } from "@react-router/dev/routes";

export default [
	index("routes/new.tsx"),
	route("scene/:id", "routes/home.tsx"),

	// route("player", "./routes/player.tsx"),
	//APIS
	...prefix("api", [
		route("scene", "./api/scene.ts"),
		route("scene/:id/delete", "./api/scene-delete.ts"),
		route("tree", "./api/tree.ts"),
		route("upload", "./api/assets-upload.ts"),
		route("capsule/:id/*", "./api/capsule.ts"),
		route("decor", "./api/decor.ts"),
		route("item/:id", "./api/item.ts"),
		route("content/:id", "./api/content.ts"),
		route("scene-content/cues", "./api/scene-content-cues.ts"),
		route("theme/:id", "./api/theme.ts")
	])
] satisfies RouteConfig;
