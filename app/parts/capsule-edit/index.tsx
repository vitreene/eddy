import { useContext, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { SceneContext } from '~/provider/scene-provider';

export function EditCapsule() {
	const fetcher = useFetcher();

	const comp = useContext(SceneContext);
	const capsule = comp?.scene.capsules.find((c) => c.id == comp?.state.capsule);

	return (
		<div className="edit">
			<h2>EDIT</h2>
			{capsule && <p>{`Capsule n°${capsule?.id} : ${capsule?.type}`}</p>}

			<fetcher.Form method="post" action={`api/capsule/${capsule?.id}`}>
				<input hidden name="id" defaultValue={capsule?.id} />
				<input name="type" defaultValue={capsule?.type} />
				<button type="submit">Valider</button>
			</fetcher.Form>
		</div>
	);
}
