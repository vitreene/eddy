import { useContext } from 'react';
import { SceneContext } from '~/provider/scene-provider';
import { Media } from '../capsule-edit/display-media';

export function EditMedia() {
	const comp = useContext(SceneContext);

	const source = comp?.scene.sources.find((s) => s.id == comp.state.mediaId);
	if (!source) return null;
	return <Media attr={source} size={'lg'} />;
}
