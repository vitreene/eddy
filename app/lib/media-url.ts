export function getMediaUrl(path: string | null | undefined): string {
	if (!path) return "";

	if (
		path.startsWith("http://") ||
		path.startsWith("https://") ||
		path.startsWith("data:") ||
		path.startsWith("blob:")
	) {
		return path;
	}

	if (path.startsWith("/api/upload")) return path;

	const normalized = path.replace(/^\/+/, "");
	return `/api/upload?path=${encodeURIComponent(normalized)}`;
}
