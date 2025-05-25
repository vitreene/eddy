import { useEffect, useRef } from 'react';

import './scenes/scene-01.css';

import { createScene, createTimeLine } from './player';
import { createTelco } from './scenes/telco';

import { SCENE_ID } from './player/constants';
import { eventtimes, persos } from './scenes/scene-02';
import { Timeline } from 'animejs';
import { preload } from './player/preload';
import { onUpdateTimeLine } from './player/on-update';

export default function App() {
	const animeScene = useRef<Timeline>(null);
	const sceneRef = useRef<HTMLElement>(null);

	useEffect(() => {
		preload(persos).then((p) => {
			if (!animeScene.current) {
				console.log('LOAD STORE', p);

				const timeLine = createTimeLine();

				const { $elements, persoChanges } = createScene({
					timeLine,
					eventtimes,
					persos: Object.values(p),
				});

				const updateTelco = createTelco(timeLine);
				const updates = [
					updateTelco,
					onUpdateTimeLine($elements, p, persoChanges),
				];
				timeLine.onUpdate = (self) => updates.forEach((up) => up(self));
				animeScene.current = timeLine;
				animeScene.current.play();
			}
		});
		return () => {
			animeScene.current && animeScene.current.revert();
			sceneRef.current.firstChild.remove;
		};
	}, []);

	return <main ref={sceneRef} id={SCENE_ID} />;
}
