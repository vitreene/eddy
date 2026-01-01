import React, { useRef, useState } from "react";
import { VisualTransformEditor } from "./index";
import type { ElementTransform } from "./lib.types";

export function DemoTransformEditor() {
	const targetRef = useRef<HTMLDivElement | null>(null);
	const [selected, setSelected] = useState(false);
	const [debug, setDebug] = useState<ElementTransform | null>(null);

	return (
		<>
			<div
				style={{ position: "relative", height: 480, border: "1px solid rgba(0,0,0,0.12)" }}
				onPointerDown={() => setSelected(false)}
			>
				<div
					ref={targetRef}
					style={{
						position: "absolute",
						left: 120,
						top: 120,
						width: 180,
						height: 120,
						transformOrigin: "50% 50%",
						transform: "translate(20px, 10px) rotate(18deg) scale(1.1, 0.9)",
						background: "rgba(59,130,246,0.20)",
						border: "1px solid rgba(59,130,246,0.45)",
						borderRadius: 10,
						boxSizing: "border-box",
						userSelect: "none"
					}}
					onPointerDown={(e) => {
						e.stopPropagation();
						setSelected(true);
					}}
				>
					<div style={{ padding: 12, fontSize: 14 }}>Clique pour sélectionner, drag pour déplacer</div>
				</div>

				<pre style={{ position: "absolute", right: 8, bottom: 8, fontSize: 11, margin: 0 }}>
					{debug ? JSON.stringify(debug, null, 2) : "—"}
				</pre>
			</div>

			{/* en dehors de la hiérarchie du target */}
			<VisualTransformEditor
				element={selected ? targetRef.current : null}
				active={selected}
				onChange={setDebug}
				applyToElement
				overlayContainer={null} // optionnel (par défaut body du ownerDocument)
			/>
		</>
	);
}

function Reparent() {
	return (
		<div className="container">
			<div className="parentA"></div>
			<div className="parentB">
				<div className="move"></div>
			</div>
		</div>
	);
}
