import {
	parseSustainEffectUiState,
	serializeSustainEffectUiState,
	type SustainEffectName,
	type SustainEffectUiState
} from "@/config/event-effects";

type Props = {
	refValue: unknown;
	onRefChange: (nextRef: string | null) => void;
	hasCustomEvents: boolean;
	showCustomEventHint?: boolean;
	effectLabel?: string;
	showAlternateOption?: boolean;
	alternate?: boolean;
	onAlternateChange?: (checked: boolean) => void;
};

export function SustainEventParams({
	refValue,
	onRefChange,
	hasCustomEvents,
	showCustomEventHint = true,
	effectLabel = "Effet sustain",
	showAlternateOption = false,
	alternate = false,
	onAlternateChange
}: Props) {
	const sustainState = parseSustainEffectUiState(refValue);

	const onUpdate = (patch: Partial<SustainEffectUiState>) => {
		const nextState: SustainEffectUiState = {
			...sustainState,
			...patch
		};
		onRefChange(serializeSustainEffectUiState(nextState));
	};

	const onChangeEffect = (value: string) => {
		onUpdate({ name: value === "zoom" ? ("zoom" as SustainEffectName) : null });
	};

	return (
		<div className="flex flex-wrap items-center gap-3">
			<label>{effectLabel}</label>
			<select value={sustainState.name ?? ""} onChange={(evt) => onChangeEffect(evt.currentTarget.value)}>
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
			{showCustomEventHint && hasCustomEvents ? (
				<span className="text-[10px] text-amber-700">Ignoré si custom-event présent</span>
			) : null}
			{showAlternateOption ? (
				<label className="ml-2 inline-flex items-center gap-1">
					<input
						type="checkbox"
						checked={alternate}
						onChange={(evt) => onAlternateChange?.(evt.currentTarget.checked)}
					/>
					<span>Alterner</span>
				</label>
			) : null}
		</div>
	);
}
