import { useEffect, useRef } from 'react';

import './scenes/scene-01.css';

import { SCENE_ID } from './player/constants';
import { eventtimes, persos } from './scenes/scene-02';
import { Timeline } from 'animejs';
import { preload } from './player/preload';
import { Player } from './player/player';
import { createTelco } from './player/deps/telco';

export default function App() {
	const animeScene = useRef<Timeline>(null);
	const sceneRef = useRef<HTMLElement>(null);

	useEffect(() => {
		preload(persos).then((p) => {
			if (!animeScene.current) {
				const render: HTMLElement = document.querySelector(`#${SCENE_ID}`);
				const player = new Player({ render, persos: p, eventtimes });
				createTelco(player.telco());

				animeScene.current = player.timeLine;
				animeScene.current.play();

				console.log(player);
			}
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
