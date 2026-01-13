"use client";
import React from "react";
import { Timeline, Timer } from "animejs";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcwIcon } from "lucide-react";

import { SceneLogicContext } from "@/provider/scene-logic";

import { preload } from "~/player/preload";
import { Player, type TelcoProps } from "~/player/player";
import { ROOT_SCENE_CLASSNAME, SCENE_ID } from "~/player/constants";

import type { PersoDef, MapEvent } from "./types";

export interface PlayerProps {
	persos: Array<PersoDef>;
	events: MapEvent;
	styles?: string;
}

const onEnd = (t: Timer) => console.log("PLAYER the end", t.duration, t);

export const PlayerRunner = React.memo(function PlayerRunner({ scene }: { scene: PlayerProps }) {
	const active = SceneLogicContext.useSelector((state) => state.context.active);
	const sceneRef = useRef<HTMLDivElement>(null);
	const [telco, setTelco] = useState<TelcoProps>(null);

	useEffect(() => {
		const { persos, events } = scene;
		if (scene && typeof window !== "undefined") {
			if (telco) telco.revert();
			preload(persos).then((p) => {
				if (p.size) {
					console.log("active.cue", active.cue);

					const render: HTMLElement | null = sceneRef.current;
					const player = new Player({ render, persos: p, eventtimes: events, onEnd });
					player.telco.seek((active.cue ?? 0) * 1000);
					setTelco(player.telco);
				}
			});
		}
	}, [active.cue, scene, telco]);

	const styles = `${scene.styles} ${ROOT_SCENE_CLASSNAME}`;

	return (
		<>
			<style>{styles}</style>
			<div ref={sceneRef} id={SCENE_ID} className="aspect-video flex-1" />
			<Telco telco={telco!} />
		</>
	);
});

function Telco({ telco }: { telco?: TelcoProps }) {
	const [progress, setProgress] = useState<number>(0);
	const [toggle, setToggle] = useState<boolean>(telco?.paused ?? true);

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
