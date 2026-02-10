import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, ChevronDown } from "lucide-react";

export interface EditableStyle {
	display?: string;
	margin?: string;
	padding?: string;
	width?: string;
	height?: string;
	minWidth?: string;
	minHeight?: string;
	maxWidth?: string;
	maxHeight?: string;
	overflow?: string;
	position?: string;
	top?: string;
	right?: string;
	bottom?: string;
	left?: string;
	zIndex?: string;

	fontFamily?: string;
	fontWeight?: string;
	fontSize?: string;
	lineHeight?: string;
	letterSpacing?: string;
	textAlign?: "left" | "center" | "right" | "justify";
	textDecorationLine?: "none" | "underline" | "line-through" | "overline";
	textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
	color?: string;

	backgroundColor?: string;
	borderColor?: string;
	borderWidth?: string;
	borderStyle?: string;
	borderRadius?: string;

	transform?: string;
	transformOrigin?: string;
}

interface StylePanelProps {
	value: EditableStyle;
	onChange: (style: EditableStyle) => void;
}

/* ───────────────────────── ROOT PANEL ───────────────────────── */

export const EditableStylePanel: React.FC<StylePanelProps> = ({ value, onChange }) => {
	const update = <K extends keyof EditableStyle>(key: K, v: EditableStyle[K]) =>
		onChange({ ...value, [key]: v });

	return (
		<Card className="bg-background flex h-full w-80 flex-col border-l text-xs">
			<Tabs defaultValue="style" className="flex h-full flex-col">
				<PanelTabs />
				<PanelHeader />

				<TabsContent value="style" className="flex-1">
					<ScrollArea className="h-full">
						<div className="space-y-4 p-3 pb-6">
							<LayoutSection value={value} onChange={update} />
							<BoxModelSection value={value} onChange={update} />
							<SizeSection value={value} onChange={update} />
							<OverflowSection value={value} onChange={update} />
							<PositionSection value={value} onChange={update} />
							<TypographySection value={value} onChange={update} />
							<BackgroundSection value={value} onChange={update} />
							<BorderSection value={value} onChange={update} />
							<TransformSection value={value} onChange={update} />
						</div>
					</ScrollArea>
				</TabsContent>

				<TabsContent value="settings" className="flex-1">
					<div className="text-muted-foreground p-3 text-[11px]">Settings tab (placeholder).</div>
				</TabsContent>
			</Tabs>
		</Card>
	);
};

/* ───────────────────────── SMALL BUILDING BLOCKS ───────────────────────── */

const PanelTabs: React.FC = () => (
	<div className="border-b px-3 pt-2">
		<TabsList className="h-7 text-[11px]">
			<TabsTrigger value="style">Style</TabsTrigger>
			<TabsTrigger value="settings">Settings</TabsTrigger>
		</TabsList>
	</div>
);

const PanelHeader: React.FC = () => (
	<div className="flex items-center justify-between border-b px-3 py-2">
		<div className="flex items-center gap-2 text-[11px]">
			<div className="flex h-4 w-4 items-center justify-center rounded border">
				<div className="border-primary h-3 w-3 border" />
			</div>
			<span>div</span>
		</div>
		<Button size="icon" variant="outline" className="h-7 w-7" aria-label="More actions">
			<ChevronDown className="h-3 w-3" />
		</Button>
	</div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
	<section className="space-y-2 border-t pt-3 first:border-t-0 first:pt-0">
		<div className="mb-1 flex items-center justify-between">
			<h3 className="text-[11px] font-medium">{title}</h3>
		</div>
		{children}
	</section>
);

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
	<span className="text-muted-foreground w-14 text-[11px]">{children}</span>
);

const NumericInput: React.FC<React.ComponentProps<typeof Input> & { suffix?: string }> = ({
	suffix,
	className,
	...props
}) => (
	<div className="relative w-full">
		<Input {...props} className={`h-7 pr-6 text-[11px] ${className ?? ""}`} type="text" />
		{suffix && (
			<span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-1 flex items-center text-[10px]">
				{suffix}
			</span>
		)}
	</div>
);

interface TinyButtonProps extends React.ComponentProps<typeof Button> {}

const TinyButton: React.FC<TinyButtonProps> = ({ className, children, ...props }) => {
	// classes de base (comportement actuel)
	const baseClasses = "h-7 px-2 text-[11px]";

	return (
		<Button
			size="sm"
			variant={props.variant ?? "outline"}
			className={`${baseClasses} ${className ?? ""}`}
			{...props}
		>
			{children}
		</Button>
	);
};

/* ───────────────────────── SECTIONS ───────────────────────── */

/* Layout (display) */
const LayoutSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Layout">
		<div className="flex items-center gap-2">
			<FieldLabel>Display</FieldLabel>
			<Select value={value.display ?? "block"} onValueChange={(v) => onChange("display", v)}>
				<SelectTrigger className="h-7 text-[11px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="block">block</SelectItem>
					<SelectItem value="inline-block">inline-block</SelectItem>
					<SelectItem value="flex">flex</SelectItem>
					<SelectItem value="grid">grid</SelectItem>
				</SelectContent>
			</Select>
		</div>
	</Section>
);

/* Box model (margin / padding) */
const BoxModelSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Space">
		<div className="grid place-items-center rounded border p-2 text-[10px]">
			<div className="grid gap-1">
				{/* Margin */}
				<div className="text-center">
					<Input
						className="mx-auto h-6 w-12 text-center text-[10px]"
						value={value.margin ?? ""}
						placeholder="0"
						onChange={(e) => onChange("margin", e.target.value)}
					/>
					<div className="text-muted-foreground text-[9px] uppercase">margin</div>
				</div>

				{/* Padding (inner box) */}
				<div className="grid place-items-center gap-1 rounded border p-2">
					<Input
						className="mx-auto h-6 w-12 text-center text-[10px]"
						value={value.padding ?? ""}
						placeholder="0"
						onChange={(e) => onChange("padding", e.target.value)}
					/>
					<div className="text-muted-foreground text-[9px] uppercase">padding</div>
				</div>
			</div>
		</div>
	</Section>
);

/* Size */
const SizeSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Size">
		<div className="grid grid-cols-2 items-center gap-2">
			<FieldLabel>Width</FieldLabel>
			<NumericInput
				value={value.width ?? ""}
				placeholder="auto"
				onChange={(e) => onChange("width", e.target.value)}
			/>

			<FieldLabel>Height</FieldLabel>
			<NumericInput
				value={value.height ?? ""}
				placeholder="auto"
				onChange={(e) => onChange("height", e.target.value)}
			/>

			<FieldLabel>Min W</FieldLabel>
			<NumericInput
				value={value.minWidth ?? ""}
				placeholder="auto"
				onChange={(e) => onChange("minWidth", e.target.value)}
			/>

			<FieldLabel>Min H</FieldLabel>
			<NumericInput
				value={value.minHeight ?? ""}
				placeholder="auto"
				onChange={(e) => onChange("minHeight", e.target.value)}
			/>

			<FieldLabel>Max W</FieldLabel>
			<NumericInput
				value={value.maxWidth ?? ""}
				placeholder="none"
				onChange={(e) => onChange("maxWidth", e.target.value)}
			/>

			<FieldLabel>Max H</FieldLabel>
			<NumericInput
				value={value.maxHeight ?? ""}
				placeholder="none"
				onChange={(e) => onChange("maxHeight", e.target.value)}
			/>
		</div>
	</Section>
);

/* Overflow */
const OverflowSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Overflow">
		<div className="flex items-center gap-2">
			<FieldLabel>Overflow</FieldLabel>
			<Select value={value.overflow ?? "visible"} onValueChange={(v) => onChange("overflow", v)}>
				<SelectTrigger className="h-7 text-[11px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="visible">visible</SelectItem>
					<SelectItem value="hidden">hidden</SelectItem>
					<SelectItem value="auto">auto</SelectItem>
					<SelectItem value="scroll">scroll</SelectItem>
				</SelectContent>
			</Select>
		</div>
	</Section>
);

/* Position */
const PositionSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Position">
		<div className="flex items-center gap-2">
			<FieldLabel>Position</FieldLabel>
			<Select value={value.position ?? "static"} onValueChange={(v) => onChange("position", v)}>
				<SelectTrigger className="h-7 text-[11px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="static">static</SelectItem>
					<SelectItem value="relative">relative</SelectItem>
					<SelectItem value="absolute">absolute</SelectItem>
					<SelectItem value="fixed">fixed</SelectItem>
					<SelectItem value="sticky">sticky</SelectItem>
				</SelectContent>
			</Select>
		</div>

		<div className="grid grid-cols-2 items-center gap-2">
			<FieldLabel>Top</FieldLabel>
			<NumericInput value={value.top ?? ""} onChange={(e) => onChange("top", e.target.value)} />

			<FieldLabel>Right</FieldLabel>
			<NumericInput value={value.right ?? ""} onChange={(e) => onChange("right", e.target.value)} />

			<FieldLabel>Bottom</FieldLabel>
			<NumericInput value={value.bottom ?? ""} onChange={(e) => onChange("bottom", e.target.value)} />

			<FieldLabel>Left</FieldLabel>
			<NumericInput value={value.left ?? ""} onChange={(e) => onChange("left", e.target.value)} />

			<FieldLabel>Z</FieldLabel>
			<NumericInput value={value.zIndex ?? ""} onChange={(e) => onChange("zIndex", e.target.value)} />
		</div>
	</Section>
);

/* Typography */
const TypographySection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => {
	const update = <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => onChange(k, v);

	const fontSize = parseInt(value.fontSize ?? "16") || 16;

	return (
		<Section title="Typography">
			{/* Font family */}
			<div className="flex items-center gap-2">
				<span className="bg-muted text-muted-foreground rounded px-2 py-1 text-[10px] font-medium">Family</span>
				<Input
					className="h-7 flex-1 text-[11px]"
					value={value.fontFamily ?? "System"}
					onChange={(e) => update("fontFamily", e.target.value)}
				/>
			</div>

			{/* Weight */}
			<div className="flex items-center gap-2">
				<FieldLabel>Weight</FieldLabel>
				<Select value={value.fontWeight ?? "400"} onValueChange={(v) => update("fontWeight", v)}>
					<SelectTrigger className="h-7 flex-1 text-[11px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="300">300 – Light</SelectItem>
						<SelectItem value="400">400 – Regular</SelectItem>
						<SelectItem value="500">500 – Medium</SelectItem>
						<SelectItem value="600">600 – Semibold</SelectItem>
						<SelectItem value="700">700 – Bold</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Color */}
			<div className="flex items-center gap-2">
				<FieldLabel>Color</FieldLabel>
				<div className="h-5 w-5 cursor-pointer rounded border" style={{ background: value.color ?? "#000000" }} />
				<Input
					className="h-7 flex-1 text-[11px]"
					value={value.color ?? "#000000"}
					onChange={(e) => update("color", e.target.value)}
				/>
			</div>

			{/* Size / line-height / spacing */}
			<div className="grid grid-cols-3 gap-2 pt-1">
				<div className="space-y-1">
					<span className="text-muted-foreground text-[11px]">Size</span>
					<div className="flex items-center gap-2">
						<Slider
							className="flex-1"
							value={[fontSize]}
							min={8}
							max={64}
							step={1}
							onValueChange={([v]) => update("fontSize", `${v}px`)}
						/>
						<span className="w-7 text-right text-[10px]">{fontSize}</span>
					</div>
				</div>

				<div className="space-y-1">
					<span className="text-muted-foreground text-[11px]">Height</span>
					<NumericInput
						value={value.lineHeight ?? ""}
						placeholder="1.2"
						onChange={(e) => update("lineHeight", e.target.value)}
					/>
				</div>

				<div className="space-y-1">
					<span className="text-muted-foreground text-[11px]">Spacing</span>
					<NumericInput
						value={value.letterSpacing ?? ""}
						placeholder="0"
						onChange={(e) => update("letterSpacing", e.target.value)}
					/>
				</div>
			</div>

			{/* Align + decoration */}
			<div className="grid grid-cols-2 gap-2 pt-1">
				{/* Align group */}
				<div className="space-y-1">
					<span className="sr-only">Text align</span>
					<div className="bg-muted/40 inline-flex w-full gap-0.5 rounded border p-0.5">
						{(
							[
								["left", AlignLeft],
								["center", AlignCenter],
								["right", AlignRight],
								["justify", AlignJustify]
							] as const
						).map(([align, Icon]) => {
							const selected = (value.textAlign ?? "left") === align;
							return (
								<TinyButton
									key={align}
									type="button"
									role="radio"
									aria-checked={selected}
									aria-label={`Align ${align}`}
									variant={selected ? "default" : "outline"}
									className="h-4 w-4 flex-1 justify-center rounded-sm"
									onClick={() => update("textAlign", align)}
								>
									<Icon size={24} />
								</TinyButton>
							);
						})}
					</div>
				</div>

				{/* Decoration group */}
				<div className="space-y-1">
					<span className="sr-only">Text decoration</span>
					<div className="bg-muted/40 inline-flex w-full gap-0.5 rounded border p-0.5">
						{(
							[
								["none", "x"],
								["underline", "U"],
								["line-through", "S"],
								["overline", "O"]
							] as const
						).map(([dec, label]) => {
							const selected = (value.textDecorationLine ?? "none") === dec;
							return (
								<TinyButton
									key={dec}
									type="button"
									role="radio"
									aria-checked={selected}
									aria-label={dec}
									variant={selected ? "default" : "outline"}
									className="flex-1 justify-center"
									onClick={() => update("textDecorationLine", dec)}
								>
									<span className="text-[11px]">{label}</span>
								</TinyButton>
							);
						})}
					</div>
				</div>
			</div>

			{/* Transform (case) */}
			<div className="grid grid-cols-4 gap-1 pt-1">
				{(
					[
						["none", "x"],
						["uppercase", "AB"],
						["capitalize", "Aa"],
						["lowercase", "ab"]
					] as const
				).map(([mode, label]) => {
					const selected = (value.textTransform ?? "none") === mode;
					return (
						<TinyButton
							key={mode}
							type="button"
							variant={selected ? "default" : "outline"}
							onClick={() => update("textTransform", mode)}
						>
							<span className="text-[11px]">{label}</span>
						</TinyButton>
					);
				})}
			</div>
		</Section>
	);
};

/* Backgrounds */
const BackgroundSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Background">
		<div className="flex items-center gap-2">
			<FieldLabel>Color</FieldLabel>
			<div
				className="h-5 w-5 cursor-pointer rounded border"
				style={{ background: value.backgroundColor ?? "transparent" }}
			/>
			<Input
				className="h-7 flex-1 text-[11px]"
				value={value.backgroundColor ?? ""}
				placeholder="transparent"
				onChange={(e) => onChange("backgroundColor", e.target.value)}
			/>
		</div>
	</Section>
);

/* Borders */
const BorderSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => (
	<Section title="Border">
		<div className="flex items-center gap-2">
			<FieldLabel>Color</FieldLabel>
			<Input
				className="h-7 flex-1 text-[11px]"
				value={value.borderColor ?? ""}
				onChange={(e) => onChange("borderColor", e.target.value)}
			/>
		</div>

		<div className="grid grid-cols-2 items-center gap-2">
			<FieldLabel>Width</FieldLabel>
			<NumericInput value={value.borderWidth ?? ""} onChange={(e) => onChange("borderWidth", e.target.value)} />

			<FieldLabel>Radius</FieldLabel>
			<NumericInput
				suffix="px"
				value={value.borderRadius ?? ""}
				onChange={(e) => onChange("borderRadius", e.target.value)}
			/>
		</div>

		<div className="flex items-center gap-2">
			<FieldLabel>Style</FieldLabel>
			<Select value={value.borderStyle ?? "none"} onValueChange={(v) => onChange("borderStyle", v)}>
				<SelectTrigger className="h-7 text-[11px]">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="none">none</SelectItem>
					<SelectItem value="solid">solid</SelectItem>
					<SelectItem value="dashed">dashed</SelectItem>
					<SelectItem value="dotted">dotted</SelectItem>
				</SelectContent>
			</Select>
		</div>
	</Section>
);

const TransformSection: React.FC<{
	value: EditableStyle;
	onChange: <K extends keyof EditableStyle>(k: K, v: EditableStyle[K]) => void;
}> = ({ value, onChange }) => {
	const [rotate, setRotate] = React.useState<number>(0);
	const [scaleX, setScaleX] = React.useState<number>(1);
	const [scaleY, setScaleY] = React.useState<number>(1);
	const [translateX, setTranslateX] = React.useState<number>(0);
	const [translateY, setTranslateY] = React.useState<number>(0);

	// Build transform string from local state
	const buildTransform = (r: number, sx: number, sy: number, tx: number, ty: number) => {
		const parts: string[] = [];
		if (tx !== 0 || ty !== 0) {
			parts.push(`translate(${tx}px, ${ty}px)`);
		}
		if (r !== 0) {
			parts.push(`rotate(${r}deg)`);
		}
		if (sx !== 1 || sy !== 1) {
			parts.push(`scale(${sx}, ${sy})`);
		}
		return parts.join(" ");
	};

	const updateTransform = (next: {
		rotate?: number;
		scaleX?: number;
		scaleY?: number;
		translateX?: number;
		translateY?: number;
	}) => {
		const r = next.rotate ?? rotate;
		const sx = next.scaleX ?? scaleX;
		const sy = next.scaleY ?? scaleY;
		const tx = next.translateX ?? translateX;
		const ty = next.translateY ?? translateY;

		setRotate(r);
		setScaleX(sx);
		setScaleY(sy);
		setTranslateX(tx);
		setTranslateY(ty);

		const transform = buildTransform(r, sx, sy, tx, ty);
		onChange("transform", transform as EditableStyle["transform"]);
	};

	const updateOrigin = (axis: "x" | "y", valuePart: string) => {
		const current = (value.transformOrigin as string | undefined) ?? "center center";
		const [currX = "center", currY = "center"] = current.split(" ");
		const next = axis === "x" ? `${valuePart} ${currY}` : `${currX} ${valuePart}`;
		onChange("transformOrigin", next as EditableStyle["transformOrigin"]);
	};

	const origin = (value.transformOrigin as string | undefined) ?? "center center";
	const [originX = "center", originY = "center"] = origin.split(" ");

	return (
		<Section title="Transform">
			{/* Rotate */}
			<div className="flex items-center gap-2">
				<FieldLabel>Rotate</FieldLabel>
				<div className="flex flex-1 items-center gap-2">
					<Slider
						className="flex-1"
						value={[rotate]}
						min={-180}
						max={180}
						step={1}
						onValueChange={([v]) => updateTransform({ rotate: v })}
					/>
					<NumericInput
						suffix="°"
						className="w-16"
						value={Number.isFinite(rotate) ? String(rotate) : "0"}
						onChange={(e) => updateTransform({ rotate: Number(e.target.value || 0) })}
					/>
				</div>
			</div>

			{/* Scale */}
			<div className="flex items-center gap-2">
				<FieldLabel>Scale</FieldLabel>
				<div className="grid flex-1 grid-cols-2 gap-2">
					<NumericInput
						className="w-full"
						value={Number.isFinite(scaleX) ? String(scaleX) : "1"}
						onChange={(e) => updateTransform({ scaleX: Number(e.target.value || 1) })}
					/>
					<NumericInput
						className="w-full"
						value={Number.isFinite(scaleY) ? String(scaleY) : "1"}
						onChange={(e) => updateTransform({ scaleY: Number(e.target.value || 1) })}
					/>
				</div>
			</div>

			{/* Translate */}
			<div className="flex items-center gap-2">
				<FieldLabel>Translate</FieldLabel>
				<div className="grid flex-1 grid-cols-2 gap-2">
					<NumericInput
						suffix="px"
						className="w-full"
						value={Number.isFinite(translateX) ? String(translateX) : "0"}
						onChange={(e) => updateTransform({ translateX: Number(e.target.value || 0) })}
					/>
					<NumericInput
						suffix="px"
						className="w-full"
						value={Number.isFinite(translateY) ? String(translateY) : "0"}
						onChange={(e) => updateTransform({ translateY: Number(e.target.value || 0) })}
					/>
				</div>
			</div>

			{/* Origin */}
			<div className="flex items-center gap-2">
				<FieldLabel>Origin</FieldLabel>
				<div className="grid flex-1 grid-cols-2 gap-2">
					<Select value={originX} onValueChange={(v) => updateOrigin("x", v)}>
						<SelectTrigger className="h-7 text-[11px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="left">left</SelectItem>
							<SelectItem value="center">center</SelectItem>
							<SelectItem value="right">right</SelectItem>
						</SelectContent>
					</Select>

					<Select value={originY} onValueChange={(v) => updateOrigin("y", v)}>
						<SelectTrigger className="h-7 text-[11px]">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="top">top</SelectItem>
							<SelectItem value="center">center</SelectItem>
							<SelectItem value="bottom">bottom</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</Section>
	);
};
