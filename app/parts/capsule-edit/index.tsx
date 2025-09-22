import { useContext, useEffect } from 'react';
import { useFetcher } from 'react-router';
import type { CapsuleComp, Media } from '~/api/db';
import { SceneContext } from '~/provider/scene-provider';

export function EditCapsule() {
	const fetcher = useFetcher();

	const comp = useContext(SceneContext);
	const capsule = comp?.scene.capsules.find((c) => c.id == comp?.state.capsule);

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
	return (
		<ul className="flex gap-4 ">
			{capsule.elements
				.sort((a, b) => a.order - b.order)
				.map((el) => (
					<li key={el.id}>
						<Media attr={el.media} size="sm" />
					</li>
				))}
		</ul>
	);
}

const SIZES = {
	sm: { w: 100, h: 80 },
	lg: { w: 250, h: 160 },
};

function Media({ attr, size }: { attr: Media; size: 'sm' | 'lg' }) {
	switch (attr.type) {
		case 'img':
			return (
				<img
					className="object-contain"
					src={attr.path!}
					width={SIZES[size].w}
					height={SIZES[size].h}
				/>
			);
		case 'text':
			return <p>{attr.content}</p>;

		default:
			break;
	}

	return null;
}
