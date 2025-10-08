import type { TextTime } from '@/api/db';
import { EditMediaContext } from '@/provider/edit-media-provider';
import cx from 'classnames';
import { useContext } from 'react';
import { SceneContext } from '~/provider/scene-provider';

export function MediaEvents() {
	const comp = useContext(SceneContext);
	const mediaActions = useContext(EditMediaContext)!;

	// TODO mieux définir cues
	const cues = comp?.scene.medias[0].events!;
	const activeAction = comp?.state.activeAction;

	const action = mediaActions.state[activeAction?.action ?? ''];
	const onChange = (event: TextTime) => {
		activeAction && mediaActions?.dispatch({ type: 'update', target: activeAction.action, payload: event });
	};
	return (
		<ul className=" flex-1 border border-amber-200 flex flex-wrap items-start">
			{cues.map((event) => (
				<li key={event.id} className="text-in-time-item">
					<input
						form="text-time"
						type="radio"
						id={event.id}
						name="text-in-time"
						value={event.id}
						onChange={() => onChange(event)}
					/>
					<label
						className={cx(
							event.count ? `color-${event.count > 3 ? 3 : event.count}` : 'color-0',
							action?.id == event.id && 'active'
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
