import { Action, ClassNameAction } from '../../types';
import { Player } from '../player';

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

		const actions = perso.actions;
		const actionChanges: Record<number, { change: Partial<Action> }> = {
			0: {
				change: initialAction,
			},
		};

		const changes: Record<number, Change> = {};

		const positions = new Set([0]);

		this.eventtimes.forEach((e, position) => {
			//TODO a traiter
			if (!Array.isArray(e)) {
				const action = actions[e.name];
				if (action) {
					const { style, ...change } = action;
					positions.add(position);
					actionChanges[position] = {
						change: { ...actionChanges[position]?.change, ...change },
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

			const className = actionChanges[position].change.className ?? '';
			const oldClassName = prev != null ? changes[prev]?.change?.className : '';

			const mixed = mixClassNames(oldClassName, className);

			changes[position].change = {
				...changes[position].change,
				...actionChanges[position].change,
				...(mixed.length && { className: mixed }),
			};
		});

		this.persoChanges.set(id, changes);
	});
}

function mixClassNames(
	oldClassName: string,
	className: string | ClassNameAction
) {
	switch (typeof className) {
		case 'string': {
			const mix = new Set([
				...(oldClassName?.length ? oldClassName.split(' ') : []),
				...(className?.length ? (className as string).split(' ') : []),
			]);
			return [...mix].join(' ');
		}

		case 'object': {
			const mix = new Set([
				...(oldClassName?.length ? oldClassName.split(' ') : []),
			]);

			for (const action in className) {
				switch (action) {
					case 'add':
						className.add.split(' ').forEach((cl) => mix.add(cl));
						break;
					case 'remove':
						className.remove.split(' ').forEach((cl) => mix.delete(cl));
				}
			}
			return [...mix].join(' ');
		}

		default:
			return oldClassName;
	}
}
