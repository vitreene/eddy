import { useContext } from 'react';
import { SceneContext } from '~/provider/scene-provider';
import { Media } from '../capsule-edit/display-media';

export function EditMedia() {
	const comp = useContext(SceneContext);

	const capsule = comp?.scene.capsules.find(
		(c) => c.id == comp.state.capsuleId
	);
	const element = capsule?.elements.find((e) => e.id == comp?.state.elementId);
	if (!element) return null;
	return <Media attr={element.media} size={'lg'} />;
}
