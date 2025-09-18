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
		if (persos && typeof window !== 'undefined')
			preload(persos).then((p) => {
				if (!animeScene.current) {
					const render: HTMLElement | null = document.querySelector(
						`#${SCENE_ID}`
					);
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
				sceneRef.current.firstChild?.remove();
		};
	}, [persos]);

	return <main ref={sceneRef} id={SCENE_ID} />;
}
