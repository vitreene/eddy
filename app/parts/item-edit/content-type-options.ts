export const MANUAL_CONTENT_TYPES = ["text", "capsule"] as const;

export type ManualContentType = (typeof MANUAL_CONTENT_TYPES)[number];

export const MANUAL_CONTENT_TYPE_OPTIONS: Array<{ value: ManualContentType; label: string }> = [
	{ value: "text", label: "Texte" },
	{ value: "capsule", label: "Capsule" }
];
