"use client";
import React from "react";
import { Timeline, Timer } from "animejs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcwIcon } from "lucide-react";

import { SceneLogicContext } from "@/provider/scene-logic";

import { preload } from "~/player/preload";
import { Player, type TelcoProps } from "~/player/player";
import { ROOT_SCENE_CLASSNAME, SCENE_ID } from "~/player/constants";

import playerCss from "~/player/player.css?inline";

import type { PersoDef, MapEvent } from "./types";

export interface PlayerProps {
	persos: Array<PersoDef>;
	events: MapEvent;
	styles?: string;
}

const onEnd = (t: Timer) => console.log("PLAYER the end", t.duration, t);

export const PlayerRunner = React.memo(function PlayerRunner({ scene }: { scene: PlayerProps }) {
	const active = SceneLogicContext.useSelector((state) => state.context.active);
	const { send } = SceneLogicContext.useActorRef();
	const sceneRef = useRef<HTMLDivElement>(null);
	const initializedSceneRef = useRef<PlayerProps | null>(null);
	const playerTelcoRef = useRef<TelcoProps | null>(null);
	const buildTokenRef = useRef(0);
	const [telco, setTelco] = useState<TelcoProps>(null);

	useEffect(() => {
		if (initializedSceneRef.current === scene) return;
		initializedSceneRef.current = scene;
		buildTokenRef.current += 1;
		const token = buildTokenRef.current;

		if (playerTelcoRef.current) {
			playerTelcoRef.current.revert();
			playerTelcoRef.current = null;
			setTelco(null);
		}

		const { persos, events } = scene;

		if (scene && typeof window !== "undefined") {
			preload(persos).then((p) => {
				if (token !== buildTokenRef.current) return;
				if (p.size) {
					const render: HTMLElement | null = sceneRef.current;
					if (render) render.innerHTML = "";
					const player = new Player({ render, persos: p, eventtimes: events, onEnd });
					player.telco.seek((active.cue ?? 0) * 1000);
					playerTelcoRef.current = player.telco;
					setTelco(player.telco);
				}
			});
		}
	}, [scene, active.cue]);

	useEffect(() => {
		return () => {
			buildTokenRef.current += 1;
			if (playerTelcoRef.current) {
				playerTelcoRef.current.revert();
				playerTelcoRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		if (!telco) return;
		telco.seek((active.cue ?? 0) * 1000);
	}, [active.cue, telco]);

	const onProgressSeek = useCallback(
		(progress: number, timeMs: number) => {
			send({ type: "active-set", payload: { progress, cue: timeMs / 1000 } });
		},
		[send]
	);

	const styles = `@scope{${playerCss} ${scene.styles}}`;

	return (
		<>
			<style>{styles}</style>
			<div ref={sceneRef} id={SCENE_ID} className="aspect-video flex-1" />
			<Telco telco={telco!} onSeek={onProgressSeek} />
		</>
	);
});

function Telco({
	telco,
	onSeek
}: {
	telco?: TelcoProps;
	onSeek: (progress: number, timeMs: number) => void;
}) {
	const [progress, setProgress] = useState<number>(0);
	const [toggle, setToggle] = useState<boolean>(telco?.paused ?? true);

	function mouseMove(e: React.ChangeEvent<HTMLInputElement>): void {
		const value = Number(e.currentTarget.value);
		const p = (value * (telco?.duration || 0)) / 100;
		const progression = p > 0 ? p : 0;
		telco?.seek(progression);
		onSeek(value, progression);
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
		onSeek(0, 0);
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
