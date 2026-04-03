"use client";
import React from "react";
import { Timer } from "animejs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcwIcon, Volume2, VolumeX } from "lucide-react";

import { SceneLogicContext } from "@/provider/scene-logic";
import type { ActiveState } from "@/provider/types";

import { preload } from "~/player/preload";
import { Player, type TelcoProps } from "~/player/player";
import { SCENE_ID } from "@/scene-runtime/constants";
import { setPlayerNodeResolver } from "@/scene-runtime/node-resolver";

import playerCss from "~/player/player.css?inline";

import type { PersoDef, MapEvent } from "./types";

export interface PlayerProps {
	persos: Array<PersoDef>;
	events: MapEvent;
	styles?: string;
}

type TelcoController = {
	togglePlay: () => void;
	rewind: () => void;
	seek: (progress: number, timeMs: number) => void;
	toggleMute: () => boolean | null;
	syncFromActive: (active: { action: string | null; cue: number | null }) => void;
};

const onEnd = (_timer: Timer) => {};

export const PlayerRunner = React.memo(function PlayerRunner({ scene }: { scene: PlayerProps }) {
	const active = SceneLogicContext.useSelector((state) => state.context.active);
	const actorRef = SceneLogicContext.useActorRef();
	const { send } = actorRef;
	const sceneRef = useRef<HTMLDivElement>(null);
	const telcoRef = useRef<TelcoProps | null>(null);

	const [duration, setDuration] = useState(0);
	const isMuted = SceneLogicContext.useSelector((state) => state.context.active.telcoMuted === true);

	const telcoController = useMemo(
		() =>
			createTelcoController({
				getTelco: () => telcoRef.current,
				getActive: () => actorRef.getSnapshot().context.active,
				send
			}),
		[actorRef, send]
	);

	useEffect(() => {
		return initializePlayerRuntime({
			scene,
			sceneRef,
			send,
			getActive: () => actorRef.getSnapshot().context.active,
			onTelcoReady: (telco) => {
				telcoRef.current = telco;
				setDuration(telco?.duration || 0);
				if (!telco) return;
				telco.setMuted(actorRef.getSnapshot().context.active.telcoMuted === true);
			}
		});
	}, [actorRef, scene, send]);

	useEffect(() => {
		const telco = telcoRef.current;
		if (!telco) return;
		telco.setMuted(isMuted);
	}, [isMuted]);

	useEffect(() => {
		telcoController.syncFromActive({ action: active.action, cue: active.cue });
	}, [active.action, active.cue, telcoController]);

	const styles = `@scope{${playerCss} ${scene.styles}}`;

	return (
		<>
			<style>{styles}</style>
			<div ref={sceneRef} id={SCENE_ID} className="aspect-video flex-1" />
			<TelcoPanel
				progress={active.progress ?? 0}
				isPlaying={active.action === "play"}
				isMuted={isMuted}
				duration={duration}
				onTogglePlay={telcoController.togglePlay}
				onRewind={telcoController.rewind}
				onSeek={telcoController.seek}
				onToggleMute={() => {
					const muted = telcoController.toggleMute();
					if (typeof muted !== "boolean") return;
					send({ type: "active-set", payload: { telcoMuted: muted } });
				}}
			/>
		</>
	);
});

function initializePlayerRuntime({
	scene,
	sceneRef,
	send,
	getActive,
	onTelcoReady
}: {
	scene: PlayerProps;
	sceneRef: React.RefObject<HTMLDivElement | null>;
	send: (event: { type: "active-set"; payload: Partial<ActiveState> }) => void;
	getActive: () => ActiveState;
	onTelcoReady: (telco: TelcoProps | null) => void;
}) {
	let cancelled = false;
	let endedSent = false;
	let player: Player | null = null;

	preload(scene.persos).then((persos) => {
		if (cancelled || !persos.size) return;
		const render = sceneRef.current;
		if (!render) return;
		console.log({ persos: scene.persos, eventtimes: scene.events });

		render.innerHTML = "";
		player = new Player({
			render,
			persos,
			eventtimes: scene.events,
			onEnd,
			onTimelineUpdate: (self, timelineDuration) => {
				const progress = timelineDuration > 0 ? Math.round((self.currentTime / timelineDuration) * 100) : 0;

				send({ type: "active-set", payload: { progress } });

				const ended = timelineDuration > 0 && self.currentTime >= timelineDuration;
				if (ended && !endedSent) {
					endedSent = true;
					send({ type: "active-set", payload: { action: "pause" } });
				}
				if (!ended) endedSent = false;
			}
		});

		setPlayerNodeResolver((nodeId: string) => player?.getNodeByNodeId(nodeId) ?? null);
		const active = getActive();
		if (active.itemId) send({ type: "active-set", payload: { itemId: active.itemId } });

		if (active.action === "play") {
			player.telco.play();
		} else {
			player.telco.pause();
			player.telco.seek((active.cue ?? 0) * 1000);
		}

		onTelcoReady(player.telco);
	});

	return () => {
		cancelled = true;
		setPlayerNodeResolver(null);
		player?.telco.revert();
		player = null;
		onTelcoReady(null);
	};
}

function createTelcoController({
	getTelco,
	getActive,
	send
}: {
	getTelco: () => TelcoProps | null;
	getActive: () => {
		action: string | null;
		cue: number | null;
		progress: number | null;
	};
	send: (event: { type: "active-set"; payload: Partial<ActiveState> }) => void;
}): TelcoController {
	let unsubscribeSeekSync: (() => void) | null = null;
	const subscribeOnce = (subscribe?: () => () => void) => {
		if (unsubscribeSeekSync) {
			unsubscribeSeekSync();
			unsubscribeSeekSync = null;
		}
		if (!subscribe) return;
		unsubscribeSeekSync = subscribe();
	};

	return {
		togglePlay: () => {
			const telco = getTelco();
			if (!telco) return;
			subscribeOnce();
			const active = getActive();
			const willPlay = active.action !== "play";
			const shouldRestartFromZero = willPlay && typeof active.progress == "number" && active.progress >= 100;

			if (shouldRestartFromZero) telco.seek(0);
			if (willPlay) telco.play();
			else telco.pause();

			send({
				type: "active-set",
				payload: {
					...(shouldRestartFromZero ? { progress: 0, cue: 0 } : {}),
					action: willPlay ? "play" : "pause",
					...(willPlay ? { itemId: null, node: null, contentId: null, event: null } : {})
				}
			});
		},
		rewind: () => {
			const telco = getTelco();
			if (!telco) return;
			subscribeOnce();
			telco.seek(0);
			send({ type: "active-set", payload: { action: "seek", progress: 0, cue: 0 } });
		},
		seek: (progress: number, timeMs: number) => {
			const telco = getTelco();
			if (!telco) return;
			subscribeOnce();
			telco.seek(timeMs);
			send({ type: "active-set", payload: { action: "seek", progress, cue: timeMs / 1000 } });
		},
		toggleMute: () => {
			const telco = getTelco();
			if (!telco) return null;
			return telco.toggleMute();
		},
		syncFromActive: (active) => {
			const telco = getTelco();
			if (!telco) return;

			if (active.action === "play") {
				subscribeOnce();
				telco.play();
				return;
			}

			if (active.action === "pause") {
				subscribeOnce();
				telco.pause();
				return;
			}

			if (active.action === "seek") {
				telco.pause();
				subscribeOnce(() =>
					telco.subscribe(() => {
						subscribeOnce();
						send({ type: "active-set", payload: { action: null } });
					})
				);
				telco.seek((active.cue ?? 0) * 1000);
			}
		}
	};
}

function TelcoPanel({
	progress,
	isPlaying,
	isMuted,
	duration,
	onTogglePlay,
	onRewind,
	onSeek,
	onToggleMute
}: {
	progress: number;
	isPlaying: boolean;
	isMuted: boolean;
	duration: number;
	onTogglePlay: () => void;
	onRewind: () => void;
	onSeek: (progress: number, timeMs: number) => void;
	onToggleMute: () => void;
}) {
	const onRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const nextProgress = Number(e.currentTarget.value);
		const timeMs = ((duration || 0) * nextProgress) / 100;
		onSeek(nextProgress, timeMs > 0 ? timeMs : 0);
	};

	return (
		<div id="telco" className="flex items-center gap-2 border border-stone-500 p-1">
			<button
				type="button"
				className="aspect-square shrink-0 rounded-md border border-stone-500 p-1"
				onClick={onTogglePlay}
			>
				{isPlaying ? <Pause /> : <Play />}
			</button>
			<button
				type="button"
				className="aspect-square shrink-0 rounded-md border border-stone-500 p-1"
				onClick={onRewind}
			>
				<RotateCcwIcon />
			</button>
			<input
				type="range"
				min="0"
				max="100"
				step="1"
				value={progress}
				onChange={onRangeChange}
				className="flex-1"
			/>
			<output>{progress}&nbsp;%</output>
			<button
				type="button"
				title={isMuted ? "Retablir le son" : "Couper le son"}
				className="aspect-square shrink-0 rounded-md border border-stone-500 p-1"
				onClick={onToggleMute}
			>
				{isMuted ? <VolumeX /> : <Volume2 />}
			</button>
		</div>
	);
}
