"use client";
import React from "react";
import { Timeline } from "animejs";
import { Play, Pause, RotateCcwIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Player } from "~/player/player";
import { preload } from "~/player/preload";
import { ROOT_SCENE_CLASSNAME, SCENE_ID } from "~/player/constants";
import type { PersoDef, MapEvent } from "./types";
import type { Subscribed } from "./deps/pubsub";

export interface PlayerProps {
	persos: Array<PersoDef>;
	events: MapEvent;
	styles?: string;
}

export const PlayerRunner = React.memo(function PlayerRunner({ scene }: { scene: PlayerProps }) {
	const animeScene = useRef<Timeline>(null);
	const sceneRef = useRef<HTMLDivElement>(null);
	const [telco, setTelco] = useState<TelcoProps>();

	useEffect(() => {
		const { persos, events } = scene;

		if (scene && typeof window !== "undefined") {
			if (animeScene.current) animeScene.current.revert();
			console.log("useEffect");
			preload(persos).then((p) => {
				const render: HTMLElement | null = sceneRef.current;
				const player = new Player({ render, persos: p, eventtimes: events });
				setTelco(player.telco());

				animeScene.current = player.timeLine;
				animeScene.current.play();
			});
		}
	}, [scene]);

	const styles = `${scene.styles} ${ROOT_SCENE_CLASSNAME}`;

	return (
		<>
			<style>{styles}</style>
			<div className="flex-1" ref={sceneRef} id={SCENE_ID} />
			<Telco telco={telco!} />
		</>
	);
});

interface TelcoProps {
	seek: (time: number) => Timeline;
	pause: () => Timeline;
	play: () => Timeline;
	replay: () => Timeline;
	duration: number;
	susbscribe: (up: Subscribed<Timeline>) => () => void;
}

function Telco({ telco }: { telco?: TelcoProps }) {
	const [progress, setProgress] = useState<number>();
	const [toggle, setToggle] = useState<boolean>(false);

	function mouseMove(e: React.ChangeEvent<HTMLInputElement>): void {
		const value = Number(e.currentTarget.value);
		const p = (value * (telco?.duration || 0)) / 100;
		const progression = p > 0 ? p : 0;
		telco?.seek(progression);
	}

	useEffect(() => {
		if (telco) {
			toggle ? telco.pause() : telco.play();
		}
	}, [telco, toggle]);

	useEffect(() => {
		if (!telco) return;
		const unsusbscribe = telco.susbscribe((self: Timeline) => {
			setProgress(Math.round((self.currentTime / telco.duration) * 100));
		});
		return unsusbscribe;
	}, [telco, setProgress]);

	const togglePlay = () => setToggle((t) => !t);
	const replay = () => {
		telco?.replay();
		setToggle(false);
	};

	return (
		<div id="telco" className="flex items-center gap-2 border border-stone-500 p-1">
			<button className="aspect-square shrink-0 rounded-md border border-stone-500 p-1" onClick={togglePlay}>
				{toggle ? <Play /> : <Pause />}
			</button>
			<button className="aspect-square shrink-0 rounded-md border border-stone-500 p-1" onClick={replay}>
				<RotateCcwIcon />
			</button>
			<input type="range" min="0" max="100" step="1" value={progress} onChange={mouseMove} className="flex-1" />
			<output>{progress}&nbsp;%</output>
		</div>
	);
}
