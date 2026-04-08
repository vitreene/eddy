import { getScene } from "../app/api/db";
import { buildScene } from "../app/player/builder";
import { setStaticChanges } from "../app/player/deps/static-changes";
import { onUpdateStaticChanges } from "../app/player/deps/on-update";
import { restoreNodeFromInitial } from "../app/player/deps/initial-state";
import { SCENE_ID } from "../app/scene-runtime/constants";

import type { Player } from "../app/player/player";
import type { ID, Perso } from "../app/player/types";

class FakeHTMLElement {}

(globalThis as any).HTMLElement = FakeHTMLElement;

type SnapshotEntry = {
	parentId: string | null;
	className: string;
	style: Record<string, string>;
};

function createStyleBag() {
	const values: Record<string, string> = {};
	const style: any = {
		setProperty(name: string, value: string) {
			values[name] = String(value);
		},
		removeProperty(name: string) {
			delete values[name];
			delete style[name];
		},
		clear() {
			for (const key of Object.keys(values)) delete values[key];
			for (const key of Object.keys(style)) {
				if (["setProperty", "removeProperty", "clear", "snapshot"].includes(key)) continue;
				delete style[key];
			}
		},
		snapshot() {
			const inline: Record<string, string> = {};
			for (const [key, value] of Object.entries(values)) inline[key] = String(value);
			for (const [key, value] of Object.entries(style)) {
				if (["setProperty", "removeProperty", "clear", "snapshot"].includes(key)) continue;
				if (typeof value === "string" && value.length) inline[key] = value;
			}
			return inline;
		}
	};
	return style;
}

function createNode(id: ID) {
	const node: any = new FakeHTMLElement();
	node.id = String(id);
	node.className = "";
	node.textContent = "";
	node.src = "";
	node.style = createStyleBag();
	node.parentElement = null;
	node.offsetParent = null;
	node.offsetLeft = 0;
	node.offsetTop = 0;
	node.offsetWidth = 0;
	node.offsetHeight = 0;
	node.clientWidth = 0;
	node.clientHeight = 0;
	node.appendChild = (child: any) => {
		child.parentElement = node;
		child.offsetParent = node;
	};
	node.removeChild = (child: any) => {
		if (child.parentElement === node) {
			child.parentElement = null;
			child.offsetParent = null;
		}
	};
	node.setAttribute = (_k: string, _v: string) => {};
	node.removeAttribute = (name: string) => {
		if (name === "style") node.style.clear();
	};
	node.getBoundingClientRect = () => ({ x: 0, y: 0, width: 0, height: 0 });
	return node;
}

function snapshotPresentElements(player: any): Record<string, SnapshotEntry> {
	const out: Record<string, SnapshotEntry> = {};
	for (const [id, node] of player.$elements.entries() as Iterable<[ID, any]>) {
		if (String(id) === SCENE_ID) continue;
		if (!node.parentElement) continue;
		out[String(id)] = {
			parentId: node.parentElement?.id ?? null,
			className: String(node.className || ""),
			style: node.style?.snapshot ? node.style.snapshot() : {}
		};
	}
	return out;
}

function resetToInitial(player: any, initialParentById: Map<ID, any>) {
	for (const setter of player.updateRuntime.setters.values()) {
		if (setter && typeof setter.revert === "function") setter.revert();
	}
	player.updateRuntime.persoPositions.clear();
	player.updateRuntime.transitions.clear();
	player.updateRuntime.setters.clear();
	player.updateRuntime.previousTime = null;
	player.lastEndCoords.clear();

	for (const [id, changes] of player.persoChanges.entries() as Iterable<[ID, Record<number, any>]>) {
		for (const change of Object.values(changes)) {
			if (change && typeof change === "object" && "snapshot" in change) delete change.snapshot;
		}
	}

	for (const [, node] of player.$elements.entries() as Iterable<[ID, any]>) {
		node.style.removeProperty("width");
		node.style.removeProperty("height");
		node.style.removeProperty("transform");
		node.style.removeProperty("transform-origin");
		node.style.removeProperty("rotate");
		node.style.removeProperty("scale");
		node.style.removeProperty("scaleX");
		node.style.removeProperty("scaleY");
		node.style.removeProperty("originX");
		node.style.removeProperty("originY");
	}

	for (const perso of player.persos.values() as Iterable<Perso>) {
		const node = player.$elements.get(perso.initial.id);
		if (!node) continue;
		restoreNodeFromInitial({
			node,
			initial: perso.initial as any,
			resolveParentById: (targetId) => player.$elements.get(targetId) ?? null,
			resolveDefaultParent: () => initialParentById.get(perso.initial.id) ?? null
		});
	}
}

function diffSnapshots(
	playback: Record<string, SnapshotEntry>,
	seek: Record<string, SnapshotEntry>
): Array<{ id: string; playback: SnapshotEntry | null; seek: SnapshotEntry | null }> {
	const ids = new Set([...Object.keys(playback), ...Object.keys(seek)]);
	const diffs: Array<{ id: string; playback: SnapshotEntry | null; seek: SnapshotEntry | null }> = [];
	for (const id of ids) {
		const a = playback[id] ?? null;
		const b = seek[id] ?? null;
		if (JSON.stringify(a) !== JSON.stringify(b)) diffs.push({ id, playback: a, seek: b });
	}
	return diffs;
}

const originalLog = console.log;
console.log = (...args: unknown[]) => {
	if (args[0] === "[seek-trace]") return;
	originalLog(...args);
};

async function main() {
	const source = await getScene(3);
	const scene = buildScene(source as any);

	const player: any = Object.create((await import("../app/player/player")).Player.prototype) as Player;
	player.persos = scene.persos;
	player.eventtimes = scene.events;
	player.mediaStatus = new Map();
	player.$elements = new Map([[SCENE_ID, createNode(SCENE_ID)]]);
	player.persoChanges = new Map();
	player.updateRuntime = {
		persoPositions: new Map(),
		transitions: new Map(),
		setters: new Map(),
		previousTime: null
	};
	player.lastEndCoords = new Map();
	player.applyMediaChanges = () => {};
	player._createMoveTransition = (): void => undefined;
	player.isStaticUpdateSuppressed = () => false;

	for (const perso of scene.persos) {
		player.$elements.set(perso.initial.id, createNode(perso.initial.id));
	}

	for (const perso of scene.persos) {
		const node = player.$elements.get(perso.initial.id);
		if (!node) continue;
		if (typeof perso.initial.className === "string") node.className = perso.initial.className;
		if (Object.prototype.hasOwnProperty.call(perso.initial, "content")) {
			node.textContent = typeof perso.initial.content === "string" ? perso.initial.content : "";
		}
		if (typeof perso.initial.move === "string") {
			const parent = player.$elements.get(perso.initial.move);
			if (parent) parent.appendChild(node);
		}
	}

	const initialParentById = new Map<ID, any>();
	for (const perso of scene.persos) {
		const node = player.$elements.get(perso.initial.id);
		initialParentById.set(perso.initial.id, node?.parentElement ?? null);
	}

	setStaticChanges.call(player);
	const updater = onUpdateStaticChanges.call(player);

	const sampleTimes = [0, 1000, 2000, 3000, 4000];
	const playbackByTime = new Map<number, Record<string, SnapshotEntry>>();
	const seekByTime = new Map<number, Record<string, SnapshotEntry>>();

	resetToInitial(player, initialParentById);
	for (const t of sampleTimes) {
		updater({ iterationCurrentTime: t } as any);
		playbackByTime.set(t, snapshotPresentElements(player));
	}

	for (const t of sampleTimes) {
		resetToInitial(player, initialParentById);
		player.seekChanges(t);
		seekByTime.set(t, snapshotPresentElements(player));
	}

	originalLog("--- Playback vs Seek Diff (scene 3) ---");
	for (const t of sampleTimes) {
		const playback = playbackByTime.get(t) || {};
		const seek = seekByTime.get(t) || {};
		const diffs = diffSnapshots(playback, seek);
		originalLog(
			`t=${t}ms present(playback)=${Object.keys(playback).length} present(seek)=${Object.keys(seek).length} diffs=${diffs.length}`
		);
		for (const diff of diffs.slice(0, 8)) {
			originalLog(JSON.stringify({ t, id: diff.id, playback: diff.playback, seek: diff.seek }));
		}
	}
}

void main();
