'use client';

import { Timeline } from 'animejs';
import { useEffect, useRef } from 'react';

import { Player } from '~/player/player';
import { preload } from '~/player/preload';
import { SCENE_ID } from '~/player/constants';
import { createTelco } from '~/player/deps/telco';
import type { PersoDef, MapEvent } from './types';

export interface PlayerProps {
	persos: Array<PersoDef>;
	eventtimes: MapEvent;
}

export function PlayerRunner({ persos, eventtimes }: PlayerProps) {
	const animeScene = useRef<Timeline>(null);
	const sceneRef = useRef<HTMLElement>(null);

	useEffect(() => {
		if (persos && eventtimes && typeof window !== 'undefined') {
			animeScene.current && animeScene.current.revert();

			preload(persos).then((p) => {
				if (!animeScene.current) {
					const render: HTMLElement | null = sceneRef.current;
					const player = new Player({ render, persos: p, eventtimes });
					const telco = player.telco();
					createTelco(telco);
					animeScene.current = player.timeLine;
					animeScene.current.play();
					telco.seek(0);

					console.log(player);
				}
			});
		}
	}, [persos, eventtimes]);

	return <main ref={sceneRef} id={SCENE_ID} />;
}
