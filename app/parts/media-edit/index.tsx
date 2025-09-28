import { useContext } from 'react';
import { Form } from 'react-router';

import { SceneContext } from '~/provider/scene-provider';

import { MediaEvents } from './media-events';
import { EditMediaActions } from './edit-media-actions';

export function EditMedia() {
	const comp = useContext(SceneContext);

	const capsule = comp?.scene.capsules.find((c) => c.id == comp.state.capsuleId);
	const element = capsule?.elements.find((e) => e.id == comp?.state.elementId);
	const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		formData.forEach((v, k) => console.log(k, v));
	};

	if (!element) return null;
	return (
		<section className="flex gap-4">
			<Form onSubmit={onSubmit}>
				<EditMediaActions element={element} />
			</Form>
			<MediaEvents />
		</section>
	);
}
