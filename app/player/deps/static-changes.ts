import { P } from "../types";

import type { Player } from "../player";
import type { Action, ActionAtributes, ClassNameAction } from "../types";

export interface Change {
	prev: number | null;
	curr: number | null;
	next: number | null;
	snapshot?: {
		x: number | string;
		y: number | string;
		width: number | string;
		height: number | string;
		originX?: number | string;
		originY?: number | string;
	};
	change: Partial<ActionAtributes>;
}
export function setStaticChanges(this: Player) {
	this.persos.forEach((perso) => {
		const { id, style, tag, ...initialAction } = perso.initial;
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

		this.eventtimes.forEach((evt, position) => {
			// si c'est une video, completer les changes avec startAt et offset

			//TODO a traiter la récursivité

			(Array.isArray(evt) ? evt : [evt]).map((e) => {
				const action = actions[e.name];
				if (action && typeof action !== "boolean") {
					const { style, ...change } = action;

					if (change && isVideo && change.media) {
						change.media.changeAt = change.media.changeAt ?? position;

						offset = change.media.offset ?? offset;
						if (change.media.action == "play") {
							prevPosition = position;
						}
						if (change.media.action == "pause") {
							offset = offset + (position - prevPosition);
						}

						change.media.offset = offset;
					}

					const newChange = { ...((actionChanges[position]?.change as object) || {}), ...change };
					if (Object.keys(newChange).length) {
						positions.add(position);
						actionChanges[position] = { change: newChange };
					}
				}
			});
		});
		const positionsSorted = [...positions].sort((a, b) => (a < b ? -1 : 1));

		// console.log("positions", [...positions], positonsSorted, actionChanges);

		positionsSorted.forEach((position, index, positionsSorted) => {
			changes[position] = {} as Change;
			const prev = positionsSorted[index - 1] ?? null;
			const next = positionsSorted[index + 1] ?? null;
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
		// console.log("changes", changes);

		this.persoChanges.set(id, changes);
	});
}

/**
 * Mix two class name inputs:
 * - If `oldClassName` is a string: start from its classes.
 * - If `oldClassName` is an action: start from empty and apply it.
 * Then apply `className`:
 * - string => union add
 * - action => add/remove
 */
type ClassNameInput = string | ClassNameAction | undefined | null;
export function mixClassNames(oldClassName: ClassNameInput = "", className: ClassNameInput = ""): string {
	// 1) Build initial set from oldClassName
	const result = new Set<string>();

	if (typeof oldClassName === "string") {
		for (const cls of splitClasses(oldClassName)) result.add(cls);
	} else if (oldClassName && typeof oldClassName === "object") {
		applyClassNameActions(result, oldClassName);
	}

	// 2) Apply incoming className
	if (typeof className === "string") {
		for (const cls of splitClasses(className)) result.add(cls);
	} else if (className && typeof className === "object") {
		applyClassNameActions(result, className);
	}

	// 3) Return normalized string
	return Array.from(result).join(" ");
}

function splitClasses(classname: string): string[] {
	return classname
		.split(" ")
		.map((s) => s.trim())
		.filter(Boolean);
}

function applyClassNameActions(set: Set<string>, clsAction: ClassNameAction): void {
	if (clsAction.add) {
		for (const cls of splitClasses(clsAction.add)) set.add(cls);
	}
	if (clsAction.remove) {
		for (const cls of splitClasses(clsAction.remove)) set.delete(cls);
	}
}
