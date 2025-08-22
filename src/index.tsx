import { useEffect, useRef } from 'react';
import Lottie from 'lottie-web';

import './scenes/scene-01.css';

import { createScene, createTimeLine } from './player';
import { createTelco } from './scenes/telco';

import { SCENE_ID } from './player/constants';
import { eventtimes, persos } from './scenes/scene-02';
import { Timeline } from 'animejs';
import { preload } from './player/preload';
import { onUpdateTimeLine } from './player/on-update';
import { Player } from './player/main';

export default function App() {
	const animeScene = useRef<Timeline>(null);
	const sceneRef = useRef<HTMLElement>(null);

	useEffect(() => {
		preload(persos).then((p) => {
			if (!animeScene.current) {
				const render: HTMLElement = document.querySelector(`#${SCENE_ID}`);
				const player = new Player({ render, persos: p, eventtimes });
				animeScene.current = player.timeLine;
				animeScene.current.play();
			}

			/* if (!animeScene.current) {
				console.log('LOAD STORE', p);
				const timeLine = createTimeLine();
				const { $elements, persoChanges } = createScene({
					timeLine,
					eventtimes,
					persos: [...p.values()],
				});

				const updateTelco = createTelco(timeLine);
				const updates = [
					updateTelco,
					onUpdateTimeLine($elements, p, persoChanges),
				];
				timeLine.onUpdate = (self) => updates.forEach((up) => up(self));
				animeScene.current = timeLine;
				animeScene.current.play();
			} */
		});

		return () => {
			console.log('REVERT');
			animeScene.current && animeScene.current.revert();
			sceneRef.current instanceof HTMLElement &&
				sceneRef.current.firstChild.remove;
		};
	}, []);

	return (
		<>
			<main ref={sceneRef} id={SCENE_ID} />
		</>
	);
}
