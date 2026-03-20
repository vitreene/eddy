import type { ContentEvent } from "@/api/db";

import {
	parseSustainEffectUiState,
	serializeSustainEffectUiState,
	type SustainEffectUiState
} from "@/config/event-effects";
import { deriveEventKind } from "@/config/custom-events";
import { SceneLogicContext } from "@/provider/scene-logic";

type Props = {
	event: ContentEvent;
	events: Record<string, ContentEvent | undefined> | null;
};

export function SustainEventParams({ event, events }: Props) {
	const { send } = SceneLogicContext.useActorRef();
	const sustainState = parseSustainEffectUiState(event.ref);
	const hasCustomEvents = Boolean(
		events &&
		Object.values(events).some((entry) => Boolean(entry) && deriveEventKind(entry!.action) === "custom")
	);

	const onUpdate = (patch: Partial<SustainEffectUiState>) => {
		const nextState: SustainEffectUiState = {
			...sustainState,
			...patch
		};
		send({
			type: "events-update",
			payload: {
				action: event.action,
				ref: serializeSustainEffectUiState(nextState)
			}
		});
	};

	return (
		<div className="flex items-center gap-3">
			<label>Effet sustain</label>
			<select
				value={sustainState.name ?? ""}
				onChange={(evt) =>
					onUpdate({
						name: evt.currentTarget.value === "zoom" ? "zoom" : null
					})
				}
			>
				<option value="">--</option>
				<option value="zoom">zoom</option>
			</select>

			<label>Direction</label>
			<select
				value={sustainState.direction}
				disabled={sustainState.name !== "zoom"}
				onChange={(evt) => onUpdate({ direction: evt.currentTarget.value === "initial" ? "initial" : "final" })}
			>
				<option value="final">final</option>
				<option value="initial">initial</option>
			</select>

			<label>Scale</label>
			<input
				type="range"
				min={1}
				max={1.5}
				step={0.01}
				disabled={sustainState.name !== "zoom"}
				value={sustainState.value}
				onChange={(evt) => onUpdate({ value: Number(evt.currentTarget.value) })}
			/>
			<span>{sustainState.value.toFixed(2)}</span>
			{hasCustomEvents ? (
				<span className="text-[10px] text-amber-700">Ignoré si custom-event présent</span>
			) : null}
		</div>
	);
}
