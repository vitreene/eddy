import { index, route, prefix } from "@react-router/dev/routes";
import type { RouteConfig } from "@react-router/dev/routes";

export default [
	index("routes/home.tsx"),
	// route("scene/:id", "routes/home.tsx"),
	route("player", "./routes/player.tsx"),
	//APIS
	...prefix("api", [
		route("capsule/:id/*", "./api/capsule.ts"),
		route("decor", "./api/decor.ts"),
		route("item/:id", "./api/item.ts"),
		route("media/:id", "./api/media.ts")
	])
] satisfies RouteConfig;
