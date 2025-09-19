import { useContext } from 'react';
import cx from 'classnames';
import { SceneContext } from '~/provider/scene-provider';

export function Capsules() {
	const comp = useContext(SceneContext);
	const selectCapsule = (e: any) => {
		console.log('select:', e.target.value);

		comp?.dispatch({ type: 'edit-capsule', capsule: e.target.value });
	};
	if (!comp) return null;
	console.log(comp.state);

	return (
		<ul className="text-xs">
			{comp.scene.capsules.map((c, i) => (
				<li key={c.id}>
					<button
						className={cx(
							'px-2 py-1 mb-1 whitespace-nowrap',
							comp.state.capsule == c.id
								? 'bg-amber-200 hover:bg-amber-300'
								: 'hover:bg-slate-200'
						)}
						value={c.id}
						onClick={selectCapsule}
					>{`Capsule n°${i + 1}`}</button>
				</li>
			))}
		</ul>
	);
}
