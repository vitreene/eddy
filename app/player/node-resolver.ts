let resolveNode: ((nodeId: string) => HTMLElement | null) | null = null;

export function setPlayerNodeResolver(resolver: ((nodeId: string) => HTMLElement | null) | null) {
	resolveNode = resolver;
}

export function getPlayerNode(nodeId: string | null | undefined): HTMLElement | null {
	if (!resolveNode || !nodeId) return null;
	return resolveNode(nodeId);
}
