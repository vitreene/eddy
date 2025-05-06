import { useEffect, useRef } from 'react';

import './scenes/scene-01.css';

import { timeLineScene } from './player';
import { createTelco } from './scenes/telco';

import { SCENE_ID } from './player/constants';
import { eventtimes, persos } from './scenes/scene-01';
import { Timeline } from 'animejs';

export default function App() {
	const animeScene = useRef<Timeline>(null);

	useEffect(() => {
		if (!animeScene.current) {
			animeScene.current = timeLineScene({ eventtimes, persos });
			setTimeout(() => {
				// animeScene.current.complete().reverse();
				animeScene.current.play();
				console.log(animeScene.current);
			}, 500);

			createTelco(animeScene.current);
		}
		return () => {
			animeScene.current.revert();
		};
	}, []);

	return <main id={SCENE_ID} />;
}
