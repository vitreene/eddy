import { useContext, useEffect } from 'react';
import { Form } from 'react-router';

import { SceneContext } from '~/provider/scene-provider';

import { MediaEvents } from './media-events';
import { EditMediaActions } from './edit-media-actions';
import { EditMediaContext } from '@/provider/edit-media-provider';
import type { TextTime } from '@/api/db';

/* 

ca ne correspond pas. il manque de nommer l'event pour l'édition : intro/outro/idle... 
le repère deviendra le nom de l'action avec le contenu de la transition. 

 ElementComp.events: {			->				EditMediaContext.state
 		ref: string;												ref: string  -> transition, details...
    name: string; 											name: string; -> label time
    action: string;											action: string; -> name  intro, outro..
    duration: number | null;
    elementId: number;
}[]
*/

export function EditMedia() {
	const comp = useContext(SceneContext);
	const mediaActions = useContext(EditMediaContext);

	const capsule = comp?.scene.capsules.find((c) => c.id == comp.state.capsuleId);
	const element = capsule?.elements.find((e) => e.id == comp?.state.elementId);

	const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const payload = {} as TextTime;
		let target = '';
		formData.forEach((v, k) => {
			if (k == 'target') target = v as string;
			else (payload as any)[k] = v as string;
		});
		mediaActions?.dispatch({ type: 'add', target, payload });
	};

	if (!element) return null;
	return (
		<section className="flex gap-4">
			<Form onSubmit={onSubmit}>
				<EditMediaActions element={element} />
			</Form>
			<MediaEvents key={comp?.state.activeAction?.action} />
		</section>
	);
}
