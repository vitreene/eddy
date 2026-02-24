import type { Content } from "@/api/db";
import cx from "classnames";
import { getMediaUrl } from "@/lib/media-url";

const SIZECSS = {
	icon: "w-10  h-8",
	sm: "w-24 h-20",
	lg: "w-64 h-40"
};

export function Media({
	attr,
	size,
	selected = false,
	className = ""
}: {
	attr: Content;
	size: keyof typeof SIZECSS;
	selected?: boolean;
	className?: string;
}) {
	const mediaSrc = getMediaUrl(attr.path);

	switch (attr.type) {
		case "img":
			return (
				<img
					className={cx(className, SIZECSS[size], "object-contain", {
						"border border-red-400": selected
					})}
					src={mediaSrc}
					draggable={false}
				/>
			);
		case "text":
			return <p>{attr.inner}</p>;
		case "capsule":
			return (
				<div
					className={cx(className, SIZECSS[size], "bg-blue-100 object-contain", {
						"border border-red-400": selected
					})}
				/>
			);

		default:
			break;
	}

	return null;
}
