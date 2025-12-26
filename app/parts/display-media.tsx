import cx from "classnames";

import type { Media } from "@prisma/client";

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
	attr: Media;
	size: keyof typeof SIZECSS;
	selected?: boolean;
	className?: string;
}) {
	switch (attr.type) {
		case "img":
			return (
				<img
					className={cx(className, SIZECSS[size], "object-contain", {
						"border border-red-400": selected
					})}
					src={attr.path!}
					draggable={false}
				/>
			);
		case "text":
			return <p>{attr.content}</p>;
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
