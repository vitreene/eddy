import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import type { Route } from "../+types/root";
import { createContent } from "./db";

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

	const assetsDir = path.join(process.cwd(), "public", "assets");
	await mkdir(assetsDir, { recursive: true });

	const savedFiles: UploadedFile[] = [];
	for (const file of files) {
		const ext = getFileExt(file.name);
		const contentType = mimeToContentType(file.type) || extToContentType(ext);
		const accepted = isAcceptedMime(file.type) || isAcceptedByExt(ext);

		if (!accepted || !contentType) {
			return Response.json(
				{ ok: false, message: `Type non accepte: ${file.type || ext || file.name}` },
				{ status: 400 }
			);
		}

		const finalExt = extFromFile(file);
		const storedName = `${Date.now()}-${randomUUID()}${finalExt}`;
		const assetPath = `assets/${storedName}`;
		const fullFilePath = path.join(assetsDir, storedName);

		const content = Buffer.from(await file.arrayBuffer());
		await writeFile(fullFilePath, content);

		try {
			const createdContent = await createContent({ type: contentType, name: file.name, path: assetPath });

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
