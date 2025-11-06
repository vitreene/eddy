export function SliderRight({ className }: { className?: string }) {
	return (
		<svg
			height="100%"
			width="100%"
			viewBox="0 0 8 20"
			xmlSpace="preserve"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M1,1L4.979,1C6.083,1 6.979,1.896 6.979,3L6.979,17C6.979,18.104 6.083,19 4.979,19L1,19L1,1Z" />
			<path d="M3.253,7.286L4.726,10.154L3.253,13.022" />
		</svg>
	);
}

export function SliderLeft({ className }: { className?: string }) {
	return (
		<svg
			height="100%"
			width="100%"
			viewBox="0 0 8 20"
			xmlSpace="preserve"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			className={className}
		>
			<path d="M6.979,1L3,1C1.896,1 1,1.896 1,3L1,17C1,18.104 1.896,19 3,19L6.979,19L6.979,1Z" />
			<path d="M4.726,7.286L3.253,10.154L4.726,13.022" />
		</svg>
	);
}
