"use client";

import React from "react";
import { Timeline } from "animejs";
import { useEffect, useRef, useState } from "react";

import { Player } from "~/player/player";
import { preload } from "~/player/preload";
import { SCENE_ID } from "~/player/constants";
import type { PersoDef, MapEvent } from "./types";
import type { Subscribed } from "./deps/pubsub";

export interface PlayerProps {
	persos: Array<PersoDef>;
	events: MapEvent;
}

export const PlayerRunner = React.memo(function PlayerRunner({ scene }: { scene: PlayerProps }) {
	const animeScene = useRef<Timeline>(null);
	const sceneRef = useRef<HTMLDivElement>(null);
	const [telco, setTelco] = useState<TelcoProps>();

	useEffect(() => {
		if (scene && typeof window !== "undefined") {
			if (animeScene.current) animeScene.current.revert();
			console.log("useEffect");
			preload(scene.persos).then((p) => {
				const render: HTMLElement | null = sceneRef.current;
				const player = new Player({ render, persos: p, eventtimes: scene.events });
				setTelco(player.telco());

				animeScene.current = player.timeLine;
				animeScene.current.play();
			});
		}
	}, [scene]);

	return (
		<>
			<div className="flex-1" ref={sceneRef} id={SCENE_ID} />
			<Telco telco={telco!} />
		</>
	);
});

interface TelcoProps {
	seek: (time: number) => Timeline;
	pause: () => Timeline;
	play: () => Timeline;
	duration: number;
	susbscribe: (up: Subscribed<Timeline>) => () => void;
}

// TODO telco comme un composant React
function Telco({ telco }: { telco?: TelcoProps }) {
	const [progress, setProgress] = useState<string>();
	const [toggle, setToggle] = useState<boolean>(false);

	function mouseMove(e: React.MouseEvent<HTMLInputElement>): void {
		const value = Number(e.currentTarget.value);
		const p = (value * (telco?.duration || 0)) / 100;
		const progression = p > 0 ? p : 0;

		setProgress(Math.round(value) + "%");
		telco?.seek(progression);
	}

	useEffect(() => {
		if (telco) {
			toggle ? telco.pause() : telco.play();
		}
	}, [telco, toggle]);

	const togglePlay = () => setToggle((t) => !t);
	return (
		<div id="telco">
			<button onClick={togglePlay}>{toggle ? "play" : "pause"}</button>
			<input type="range" min="0" max="100" step="1" onMouseMove={mouseMove} />
			<output>{progress}</output>
		</div>
	);
}
