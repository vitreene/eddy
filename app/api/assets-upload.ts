import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";

import type { Route } from "../+types/root";
import { createContent } from "./db";

const DEFAULT_ASSETS_STORAGE_PATH = "public/assets";
const ASSETS_STORAGE_PATH = process.env.ASSETS_STORAGE_PATH || DEFAULT_ASSETS_STORAGE_PATH;
const ASSETS_DIR = path.join(process.cwd(), ASSETS_STORAGE_PATH);

type UploadedFile = {
	originalName: string;
	storedName: string;
	path: string;
	mimeType: string;
	size: number;
	content: {
		id: number;
		name: string;
		type: string;
		path: string | null;
	};
};

function getMimeTypeFromExtension(fileName: string): string {
	const ext = path.extname(fileName).toLowerCase();
	const byExt: Record<string, string> = {
		".jpg": "image/jpeg",
		".jpeg": "image/jpeg",
		".png": "image/png",
		".webp": "image/webp",
		".gif": "image/gif",
		".svg": "image/svg+xml",
		".mp3": "audio/mpeg",
		".wav": "audio/wav",
		".ogg": "audio/ogg",
		".m4a": "audio/mp4",
		".mp4": "video/mp4",
		".webm": "video/webm",
		".mov": "video/quicktime",
		".glb": "model/gltf-binary",
		".gltf": "model/gltf+json",
		".lottie": "application/vnd.lottie+json",
		".riv": "application/x-rive"
	};

	return byExt[ext] || "application/octet-stream";
}

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const requestedPath = url.searchParams.get("path");

	if (!requestedPath) {
		return Response.json({ ok: false, message: "Missing 'path' query parameter" }, { status: 400 });
	}

	const normalized = requestedPath.replace(/^\/+/, "");
	const fileName = path.basename(normalized);

	if (!fileName) {
		return Response.json({ ok: false, message: "Invalid asset path" }, { status: 400 });
	}

	const fullFilePath = path.join(ASSETS_DIR, fileName);

	try {
		const fileStat = await stat(fullFilePath);
		const totalSize = fileStat.size;
		const fileBuffer = await readFile(fullFilePath);
		const mimeType = getMimeTypeFromExtension(fileName);
		const range = request.headers.get("range");

		if (range) {
			const resolvedRange = resolveByteRange(range, totalSize);
			if (!resolvedRange) {
				return new Response(null, {
					status: 416,
					headers: {
						"Content-Range": `bytes */${totalSize}`,
						"Accept-Ranges": "bytes"
					}
				});
			}

			const { start, end } = resolvedRange;
			const chunk = fileBuffer.subarray(start, end + 1);
			return new Response(chunk, {
				status: 206,
				headers: {
					"Content-Type": mimeType,
					"Cache-Control": "public, max-age=31536000, immutable",
					"Accept-Ranges": "bytes",
					"Content-Range": `bytes ${start}-${end}/${totalSize}`,
					"Content-Length": String(chunk.byteLength)
				}
			});
		}

		return new Response(fileBuffer, {
			headers: {
				"Content-Type": mimeType,
				"Cache-Control": "public, max-age=31536000, immutable",
				"Accept-Ranges": "bytes",
				"Content-Length": String(totalSize)
			}
		});
	} catch {
		return Response.json({ ok: false, message: "Asset not found" }, { status: 404 });
	}
}

function resolveByteRange(rangeHeader: string, totalSize: number): { start: number; end: number } | null {
	if (!rangeHeader.startsWith("bytes=")) return null;
	const raw = rangeHeader.slice("bytes=".length).split(",")[0]?.trim();
	if (!raw) return null;

	const [startRaw, endRaw] = raw.split("-");
	const hasStart = typeof startRaw === "string" && startRaw.length > 0;
	const hasEnd = typeof endRaw === "string" && endRaw.length > 0;

	if (!hasStart && !hasEnd) return null;

	if (!hasStart && hasEnd) {
		const suffixLength = Number(endRaw);
		if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
		const end = Math.max(0, totalSize - 1);
		const start = Math.max(0, totalSize - Math.floor(suffixLength));
		if (start > end) return null;
		return { start, end };
	}

	const start = Number(startRaw);
	const end = hasEnd ? Number(endRaw) : totalSize - 1;
	if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
	const normalizedStart = Math.floor(start);
	const normalizedEnd = Math.min(Math.floor(end), totalSize - 1);
	if (normalizedStart < 0) return null;
	if (normalizedStart > normalizedEnd) return null;
	if (normalizedStart >= totalSize) return null;
	return { start: normalizedStart, end: normalizedEnd };
}

function extFromFile(file: File): string {
	const fromName = path.extname(file.name || "").toLowerCase();
	if (fromName) return fromName;

	const byMime: Record<string, string> = {
		"image/jpeg": ".jpg",
		"image/png": ".png",
		"image/webp": ".webp",
		"image/gif": ".gif",
		"image/svg+xml": ".svg",
		"audio/mpeg": ".mp3",
		"audio/wav": ".wav",
		"audio/ogg": ".ogg",
		"audio/mp4": ".m4a",
		"video/mp4": ".mp4",
		"video/webm": ".webm",
		"video/quicktime": ".mov"
	};

	return byMime[file.type] || "";
}

function isAcceptedMime(mimeType: string) {
	return (
		mimeType.startsWith("image/") ||
		mimeType.startsWith("audio/") ||
		mimeType.startsWith("video/") ||
		[
			"model/gltf-binary",
			"model/gltf+json",
			"model/obj",
			"application/x-rive",
			"application/vnd.lottie+json",
			"application/octet-stream"
		].includes(mimeType)
	);
}

function getFileExt(fileName: string): string {
	return path.extname(fileName || "").toLowerCase();
}

function isAcceptedByExt(ext: string): boolean {
	return [".lottie", ".glb", ".gltf", ".riv"].includes(ext);
}

function mimeToContentType(mimeType: string): "img" | "sound" | "video" | undefined {
	if (mimeType.startsWith("image/")) return "img";
	if (mimeType.startsWith("audio/")) return "sound";
	if (mimeType.startsWith("video/")) return "video";
	return undefined;
}

function extToContentType(ext: string): "lottie" | "rive" | "three3D" | undefined {
	if ([".glb", ".gltf"].includes(ext)) return "three3D";
	if (ext === ".lottie") return "lottie";
	if (ext === ".riv") return "rive";
	return undefined;
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const files = formData
		.getAll("files")
		.filter((entry: FormDataEntryValue): entry is File => entry instanceof File);

	if (!files.length) {
		return Response.json({ ok: false, message: "Aucun fichier recu" }, { status: 400 });
	}

	await mkdir(ASSETS_DIR, { recursive: true });

	const savedFiles: UploadedFile[] = [];
	for (const file of files) {
		const ext = getFileExt(file.name);
		const contentType = mimeToContentType(file.type) || extToContentType(ext);
		const accepted = isAcceptedMime(file.type) || isAcceptedByExt(ext);

		if (!accepted || !contentType) {
			return Response.json(
				{ ok: false, message: `Type non accepté: ${file.type || ext || file.name}` },
				{ status: 400 }
			);
		}

		const finalExt = extFromFile(file);
		const storedName = `${nanoid(10)}${finalExt}`;
		const assetPath = storedName;
		const fullFilePath = path.join(ASSETS_DIR, storedName);

		const content = Buffer.from(await file.arrayBuffer());
		await writeFile(fullFilePath, content);

		try {
			const createdContent = await createContent({ type: contentType, name: file.name, path: assetPath });
			console.log("[assets-upload] created content", {
				contentId: createdContent.id,
				storedName,
				assetPath,
				dbPath: createdContent.path,
				dbPathType: typeof createdContent.path
			});

			savedFiles.push({
				originalName: file.name,
				storedName,
				path: assetPath,
				mimeType: file.type,
				size: file.size,
				content: {
					id: createdContent.id,
					name: createdContent.name,
					type: createdContent.type,
					path: createdContent.path
				}
			});
		} catch (e) {
			await unlink(fullFilePath).catch((): null => null);
			return Response.json(
				{ ok: false, message: "Echec creation content en base", detail: e instanceof Error ? e.message : null },
				{ status: 500 }
			);
		}
	}

	return Response.json({ ok: true, files: savedFiles });
}
