import type { Capsule } from '@prisma/client';
import type { Route } from '../+types/root';

// export async function loader({ params }: Route.LoaderArgs) {
// 	const capsule = await getCapsule(Number(params.id));
// 	return capsule;
// }

export async function action({ request, params }: Route.ActionArgs) {
	const { id } = params;
	const data = await request.json();
	console.log(id, data);

	return { ok: true, id, data };
}
//
