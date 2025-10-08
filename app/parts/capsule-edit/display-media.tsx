import cx from 'classnames';

import type { Media } from '@prisma/client';

const SIZES = {
	sm: { w: 100, h: 80 },
	lg: { w: 250, h: 160 },
};
export function Media({
	attr,
	size,
	selected = false,
	className = '',
}: {
	attr: Media;
	size: 'sm' | 'lg';
	selected?: boolean;
	className?: string;
}) {
	switch (attr.type) {
		case 'img':
			return (
				<img
					className={cx(className, 'object-contain', {
						'border border-red-400': selected,
					})}
					src={attr.path!}
					width={SIZES[size].w}
					height={SIZES[size].h}
				/>
			);
		case 'text':
			return <p>{attr.content}</p>;

		default:
			break;
	}

	return null;
}
