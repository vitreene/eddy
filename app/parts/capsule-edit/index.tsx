import { useContext } from 'react';
import { useFetcher } from 'react-router';

import type { CapsuleComp } from '~/api/db';
import { SceneContext } from '~/provider/scene-provider';

import { Media } from './display-media';

export function EditCapsule() {
	const fetcher = useFetcher();

	const comp = useContext(SceneContext);
	const capsule = comp?.scene.capsules.find(
		(c) => c.id == comp?.state.capsuleId
	);

	return (
		<section className="edit flex flex-col gap-4 w-full">
			<h2>EDIT</h2>
			<header className="p-4 border border-slate-300">
				{capsule && <p>{`Capsule n°${capsule?.id} : ${capsule?.type}`}</p>}

				<fetcher.Form method="post" action={`api/capsule/${capsule?.id}`}>
					<input hidden name="id" defaultValue={capsule?.id} />
					<input name="type" defaultValue={capsule?.type} />
					<button type="submit">Valider</button>
				</fetcher.Form>
			</header>
			<article className="flex-1 p-4 border border-slate-300">
				{capsule && <CapsuleContent capsule={capsule} />}
			</article>
		</section>
	);
}

function CapsuleContent({ capsule }: { capsule: CapsuleComp }) {
	const { state, dispatch } = useContext(SceneContext)!;
	const editMedia = (id: number) => () =>
		dispatch({ type: 'edit-media', mediaId: id });
	return (
		<ul className="flex gap-4 ">
			{capsule.elements
				.sort((a, b) => a.order - b.order)
				.map((el) => (
					<li key={el.id} onClick={editMedia(el.id)}>
						<Media
							attr={el.media}
							size="sm"
							selected={state.mediaId == el.id}
						/>
					</li>
				))}
		</ul>
	);
}
