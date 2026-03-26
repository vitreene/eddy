import type { EventMediaParams } from "@/lib/event-ref";

type Props = {
	value: EventMediaParams;
	onChange: (next: EventMediaParams) => void;
};

export function MediaEventParams({ value, onChange }: Props) {
	return (
		<div className="flex items-center gap-3 rounded border border-stone-300 px-2 py-1">
			<span className="text-[10px] text-stone-500 uppercase">Media</span>
			<label className="flex items-center gap-2">
				<span>Action</span>
				<select
					value={value.action}
					onChange={(event) =>
						onChange({
							...value,
							action: event.currentTarget.value === "pause" ? "pause" : "play"
						})
					}
				>
					<option value="play">play</option>
					<option value="pause">pause</option>
				</select>
			</label>
			<label className="flex items-center gap-2">
				<span>Offset</span>
				<input
					type="number"
					step={0.1}
					min={0}
					value={Number.isFinite(value.offset) ? value.offset : 0}
					onChange={(event) => {
						const next = Number(event.currentTarget.value);
						onChange({
							...value,
							offset: Number.isFinite(next) && next >= 0 ? next : 0
						});
					}}
					className="w-16"
				/>
			</label>
		</div>
	);
}
