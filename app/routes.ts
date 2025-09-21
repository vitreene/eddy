import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
	index('routes/home.tsx'),
	route('player', './routes/player.tsx'),
	route('api/capsule/:id', './api/capsule.ts'),
] satisfies RouteConfig;
