import React, { useEffect, useMemo, useRef, useState } from "react";
import { clamp01, PinRelativeRuntime, type PinAttachment } from "./pin-relative";

function gridToPercent(col: number, row: number, cols = 10, rows = 10) {
	// centre de cellule
	return { x: ((col - 0.5) / cols) * 100, y: ((row - 0.5) / rows) * 100 };
}

export function PinDemo({ imageSrc = "" }: { imageSrc?: string }) {
	const stageRef = useRef<HTMLDivElement | null>(null);

	const aRef = useRef<HTMLDivElement | null>(null);
	const bRef = useRef<HTMLDivElement | null>(null);
	const bgRef = useRef<HTMLDivElement | null>(null);

	const parentMarkerRef = useRef<HTMLDivElement | null>(null);
	const childMarkerRef = useRef<HTMLDivElement | null>(null);

	const parentStart = useMemo(() => gridToPercent(6, 4), []);
	const childStart = useMemo(() => gridToPercent(3, 7), []);

	// Pin sélectionné (par clic direct sur le marker)
	const [activePin, setActivePin] = useState<"parent" | "child">("parent");

	// le parent est piloté via state (drag sur grille ou marker)
	const [parentPct, setParentPct] = useState(parentStart);

	const parentRtRef = useRef<PinRelativeRuntime | null>(null);
	const childRtRef = useRef<PinRelativeRuntime | null>(null);
	const parentToChildAttRef = useRef<PinAttachment | null>(null);

	useEffect(() => {
		const stage = stageRef.current;
		const a = aRef.current;
		const b = bRef.current;
		const bg = bgRef.current;
		if (!stage || !a || !b || !bg) return;

		const parent = new PinRelativeRuntime(stage, { kind: "percent", x: parentStart.x, y: parentStart.y });
		const child = new PinRelativeRuntime(stage, { kind: "percent", x: childStart.x, y: childStart.y });

		parentRtRef.current = parent;
		childRtRef.current = child;

		// Attach: A sur parent, B sur enfant
		parent.addElement(a);
		child.addElement(b);

		// BG suit le parent (background-position)
		parent.addBackground(bg, { mode: "px", layer: 0 });

		// enfant suit parent (relatif)
		parentToChildAttRef.current = parent.addPin(child);

		parent.apply();
		child.apply();
		updateMarkers(parent, child);

		const ro = new ResizeObserver(() => {
			parent.apply();
			child.apply();
			updateMarkers(parent, child);
		});
		ro.observe(stage);
		ro.observe(a);
		ro.observe(b);
		ro.observe(bg);

		return () => {
			ro.disconnect();
			parentRtRef.current = null;
			childRtRef.current = null;
			parentToChildAttRef.current = null;
		};
	}, [parentStart.x, parentStart.y, childStart.x, childStart.y]);

	// Quand parentPct change => on déplace le parent (et donc tout le monde via parent.addPin(child))
	useEffect(() => {
		const parent = parentRtRef.current;
		const child = childRtRef.current;
		if (!parent || !child) return;

		parent.move({ kind: "percent", x: parentPct.x, y: parentPct.y }, { clampToBounds: true });
		updateMarkers(parent, child);
	}, [parentPct.x, parentPct.y]);

	function updateMarkers(parent: PinRelativeRuntime, child: PinRelativeRuntime) {
		const pm = parentMarkerRef.current;
		const cm = childMarkerRef.current;
		if (pm) {
			const p = parent.pinPx;
			pm.style.setProperty("--x", `${p.x - 8}px`);
			pm.style.setProperty("--y", `${p.y - 8}px`);
		}
		if (cm) {
			const p = child.pinPx;
			cm.style.setProperty("--x", `${p.x - 8}px`);
			cm.style.setProperty("--y", `${p.y - 8}px`);
		}
	}

	function movePinFromPointer(e: React.PointerEvent, which: "parent" | "child") {
		const stage = stageRef.current;
		const parent = parentRtRef.current;
		const child = childRtRef.current;
		if (!stage || !parent || !child) return;

		const r = stage.getBoundingClientRect();
		const x = clamp01(((e.clientX - r.left) / r.width) * 100);
		const y = clamp01(((e.clientY - r.top) / r.height) * 100);

		if (which === "parent") {
			setParentPct({ x, y });
			return;
		}

		// enfant: bouge UNIQUEMENT ses dépendants
		child.move({ kind: "percent", x, y }, { clampToBounds: true });

		// IMPORTANT: on rebascule le lien parent->enfant pour que,
		// lors du prochain mouvement du parent, l'enfant soit emporté depuis sa nouvelle position
		const link = parentToChildAttRef.current;
		if (link) parent.rebaseChild(link);

		updateMarkers(parent, child);
	}

	function reset() {
		setParentPct(parentStart);
		const parent = parentRtRef.current;
		const child = childRtRef.current;
		if (parent && child) {
			child.move({ kind: "percent", x: childStart.x, y: childStart.y }, { clampToBounds: true });
			const link = parentToChildAttRef.current;
			if (link) parent.rebaseChild(link);
			updateMarkers(parent, child);
		}
		setActivePin("parent");
	}

	return (
		<div style={{ padding: 12, fontFamily: "system-ui, sans-serif" }}>
			<div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
				<button
					onClick={reset}
					style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc", background: "#fff" }}
				>
					Reset
				</button>

				<span style={{ fontSize: 12, opacity: 0.75 }}>
					Active: <b>{activePin}</b> — Parent: {parentPct.x.toFixed(1)}% , {parentPct.y.toFixed(1)}%
				</span>

				<span style={{ fontSize: 12, opacity: 0.65 }}>
					Clique un pin (noir/vert) puis drag. Drag dans la grille = déplace le pin actif.
				</span>
			</div>

			<div
				ref={stageRef}
				onPointerDown={(e) => {
					(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
					movePinFromPointer(e, activePin);
				}}
				onPointerMove={(e) => {
					if (e.buttons !== 1) return;
					movePinFromPointer(e, activePin);
				}}
				style={{
					width: "min(900px, 95vw)",
					aspectRatio: "10 / 6",
					border: "1px solid #ccc",
					display: "grid",
					gridTemplateColumns: "repeat(10, 1fr)",
					gridTemplateRows: "repeat(10, 1fr)",
					position: "relative",
					containerType: "inline-size",
					backgroundImage:
						"linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
					backgroundSize: "calc(100% / 10) calc(100% / 10)",
					userSelect: "none",
					touchAction: "none"
				}}
			>
				{/* A: base grid (2,4) span 3x2 — suit le parent */}
				<div
					ref={aRef}
					style={{
						gridColumn: "2 / span 3",
						gridRow: "4 / span 2",
						borderRadius: 10,
						display: "grid",
						placeItems: "center",
						fontWeight: 800,
						boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
						background: "rgba(40,120,255,0.18)",
						border: "1px solid rgba(40,120,255,0.35)"
					}}
				>
					A (parent)
				</div>

				{/* B: base grid (7,4) span 3x2 — suit l'enfant */}
				<div
					ref={bRef}
					style={{
						gridColumn: "7 / span 3",
						gridRow: "4 / span 2",
						borderRadius: 10,
						display: "grid",
						placeItems: "center",
						fontWeight: 800,
						boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
						background: "rgba(255,120,40,0.18)",
						border: "1px solid rgba(255,120,40,0.35)"
					}}
				>
					B (child)
				</div>

				{/* BG: background-position suit le parent */}
				<div
					ref={bgRef}
					style={{
						gridColumn: "4 / span 3",
						gridRow: "7 / span 2",
						borderRadius: 12,
						border: "1px solid rgba(0,0,0,0.2)",
						backgroundImage: imageSrc ? `url("${imageSrc}")` : "none",
						backgroundSize: "cover",
						backgroundRepeat: "no-repeat",
						backgroundPosition: "50% 50%",
						overflow: "hidden",
						position: "relative",
						boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
					}}
				>
					<div
						style={{
							position: "absolute",
							inset: 0,
							display: "grid",
							placeItems: "center",
							fontWeight: 900,
							color: "rgba(0,0,0,0.55)",
							backdropFilter: "blur(1px)"
						}}
					>
						BG (follows parent)
					</div>
				</div>

				{/* Parent pin marker (cliquable) */}
				<div
					ref={parentMarkerRef}
					role="button"
					aria-label="Parent pin"
					onPointerDown={(e) => {
						e.stopPropagation();
						setActivePin("parent");
						(stageRef.current as HTMLDivElement | null)?.setPointerCapture(e.pointerId);
						movePinFromPointer(e, "parent");
					}}
					onPointerMove={(e) => {
						if (e.buttons !== 1) return;
						e.stopPropagation();
						movePinFromPointer(e, "parent");
					}}
					style={{
						width: 16,
						height: 16,
						borderRadius: 999,
						background: activePin === "parent" ? "#111" : "rgba(0,0,0,0.55)",
						boxShadow: activePin === "parent" ? "0 0 0 5px rgba(0,0,0,0.14)" : "0 0 0 4px rgba(0,0,0,0.10)",
						position: "absolute",
						left: 0,
						top: 0,
						transform: "translate3d(var(--x, 0px), var(--y, 0px), 0)",
						cursor: "grab",
						touchAction: "none"
					}}
				/>

				{/* Child pin marker (cliquable) */}
				<div
					ref={childMarkerRef}
					role="button"
					aria-label="Child pin"
					onPointerDown={(e) => {
						e.stopPropagation();
						setActivePin("child");
						(stageRef.current as HTMLDivElement | null)?.setPointerCapture(e.pointerId);
						movePinFromPointer(e, "child");
					}}
					onPointerMove={(e) => {
						if (e.buttons !== 1) return;
						e.stopPropagation();
						movePinFromPointer(e, "child");
					}}
					style={{
						width: 16,
						height: 16,
						borderRadius: 999,
						background: activePin === "child" ? "#0a7" : "rgba(0,170,120,0.55)",
						boxShadow: activePin === "child" ? "0 0 0 5px rgba(0,170,120,0.22)" : "0 0 0 4px rgba(0,170,120,0.15)",
						position: "absolute",
						left: 0,
						top: 0,
						transform: "translate3d(var(--x, 0px), var(--y, 0px), 0)",
						cursor: "grab",
						touchAction: "none"
					}}
				/>
			</div>
		</div>
	);
}
