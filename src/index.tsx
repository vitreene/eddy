import { useLayoutEffect, useRef } from 'react';

import './scenes/scene-01.css';

import { timeLineScene } from './player';
import { createTelco } from './scenes/telco';

import { SCENE_ID } from './player/constants';
import { eventtimes, persos } from './scenes/scene-01';

export default function App() {
	const animeScene = useRef<gsap.core.Timeline>(null);

	useLayoutEffect(() => {
		if (!animeScene.current) {
			animeScene.current = timeLineScene({ eventtimes, persos });
			animeScene.current.play();
			setTimeout(() => {
				console.log(animeScene.current);
			}, 500);
		}
		return () => {
			animeScene.current.revert();
		};
	}, []);

	return <main id={SCENE_ID} />;
}
