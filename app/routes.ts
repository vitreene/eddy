import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
	index('routes/home.tsx'),
	route('player', './routes/player.tsx'),
	//APIS
	route('api/capsule/:id', './api/capsule.ts'),
	route('api/media/:id', './api/media.ts'),
] satisfies RouteConfig;
