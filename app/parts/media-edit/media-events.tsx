import cx from 'classnames';
import { useContext } from 'react';
import { SceneContext } from '~/provider/scene-provider';

export function MediaEvents() {
	const comp = useContext(SceneContext);
	const activeCue = comp?.state.activeCue;
	return (
		<ul className=" flex-1 border border-amber-200 flex flex-wrap items-start">
			{comp?.scene.medias[0].events.map((event) => (
				<li className="text-in-time-item">
					<input
						form="text-time"
						type="radio"
						id={event.id}
						name="text-in-time"
						value={event.id}
					/>
					<label
						className={cx(
							event.count
								? `color-${event.count > 3 ? 3 : event.count}`
								: 'color-0',
							activeCue == event.id && 'active'
						)}
						htmlFor={event.id}
						title={String(event.start)}
					>
						{event.text}
					</label>
				</li>
			))}
		</ul>
	);
}
