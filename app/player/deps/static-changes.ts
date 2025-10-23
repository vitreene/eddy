import { P } from "../types";

import type { Player } from "../player";
import type { Action, ClassNameAction } from "../types";

export interface Change {
	prev: number | null;
	curr: number | null;
	next: number | null;
	snapshot?: {
		x: number | string;
		y: number | string;
		width: number | string;
		height: number | string;
	};
	change: {
		className?: string;
		move?: null | boolean | string;
		content?: any;
		[key: string]: any;
	};
}
export function setStaticChanges(this: Player) {
	this.persos.forEach((perso) => {
		const { id, style, tag, move, ...initialAction } = perso.initial;
		if (!id) return;
		/* 
toutes sortes de transformation préalables des données de départ, 
comme l'ajout de parametres par défaut,
devrait se faire dans une phase distincte
pour un meilleur controle 
suivant, à deplcer après test.
*/

		const isVideo = "media" in perso && perso.type == P.VIDEO;

		if (isVideo && !("media" in initialAction)) {
			initialAction.media = { action: "pause", changeAt: 0, offset: 0 };
		}
		const actions = perso.actions;
		const actionChanges: Record<number, { change: Action }> = {
			0: {
				change: initialAction
			}
		};

		const changes: Record<number, Change> = {};

		const positions = new Set([0]);

		let offset = 0;
		let prevPosition = 0;
		// let prevAction = '';

		this.eventtimes.forEach((e, position) => {
			// si c'est une video, completer les changes avec startAt et offset

			//TODO a traiter la récursivité
			if (!Array.isArray(e)) {
				const action = actions[e.name];
				if (action && typeof action !== "boolean") {
					const { style, ...change } = action;

					if (change && isVideo && change.media) {
						change.media.changeAt = change.media.changeAt ?? position;

						offset = change.media.offset ?? offset;
						if (
							// prevAction != change.media.action &&
							change.media.action == "play"
						) {
							prevPosition = position;
						}
						if (
							// prevAction != change.media.action &&
							change.media.action == "pause"
						) {
							offset = offset + (position - prevPosition);
						}

						change.media.offset = offset;
					}

					positions.add(position);
					actionChanges[position] = {
						change: { ...((actionChanges[position]?.change as object) || {}), ...change }
					};
				}
			}
		});

		[...positions].sort().forEach((position, index, positions) => {
			changes[position] = {} as Change;
			const prev = positions[index - 1] ?? null;
			const next = positions[index + 1] ?? null;
			changes[position].curr = position;
			changes[position].prev = prev;
			changes[position].next = next;
			if (typeof actionChanges[position].change != "boolean") {
				const className = actionChanges[position].change.className ?? "";
				const oldClassName = prev != null ? changes[prev]?.change?.className : "";

				const mixed = mixClassNames(oldClassName, className);

				// Ensure className is always a string
				const { className: _ignoredClassName, ...restChange } = actionChanges[position].change;

				changes[position].change = {
					...changes[position].change,
					...restChange,
					...(mixed.length && { className: mixed })
				};
			}
		});

		this.persoChanges.set(id, changes);
	});
}

function mixClassNames(oldClassName: string = "", className: string | ClassNameAction) {
	switch (typeof className) {
		case "string": {
			const mix = new Set([
				...(oldClassName?.length ? oldClassName.split(" ") : []),
				...(className?.length ? (className as string).split(" ") : [])
			]);
			return [...mix].join(" ");
		}

		case "object": {
			const mix = new Set([...(oldClassName?.length ? oldClassName.split(" ") : [])]);

			for (const action in className) {
				switch (action) {
					case "add":
						className.add!.split(" ").forEach((cl) => mix.add(cl));
						break;
					case "remove":
						className.remove!.split(" ").forEach((cl) => mix.delete(cl));
				}
			}
			return [...mix].join(" ");
		}

		default:
			return oldClassName;
	}
}
