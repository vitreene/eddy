import { useMemo, useState } from "react";
import { File, FileText, Image, Music, Shapes, Upload, Video } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SceneLogicContext } from "@/provider/scene-logic";
import type { Content, SceneContent, TextTime } from "@/api/db";
import { CHUTIER_DRAG_MIME, toChutierDragPayload } from "@/lib/drag-content";
import { cn } from "@/lib/utils";
import { transcribeAudioFileToCues } from "@/whisper/transcribe-to-cues";

type UploadItem = {
	originalName: string;
	mimeType: string;
	content: Content;
};

const ACCEPTED_TYPES = {
	"image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"],
	"audio/*": [".mp3", ".wav", ".ogg", ".m4a"],
	"video/*": [".mp4", ".webm", ".mov", ".m4v"],
	"application/octet-stream": [".lottie", ".glb", ".gltf", ".riv"],
	"application/vnd.lottie+json": [".lottie"],
	"application/zip": [".lottie"],
	"model/gltf-binary": [".glb"],
	"model/gltf+json": [".gltf"],
	"application/x-rive": [".riv"]
};

interface ChutierProps {
	allContents?: Content[];
}

export function Chutier({ allContents = [] }: ChutierProps) {
	const { send } = SceneLogicContext.useActorRef();
	const sceneId = SceneLogicContext.useSelector((state) => state.context.id);
	const sceneContents = SceneLogicContext.useSelector((state) => Object.values(state.context.contents || {}));
	const contents = useMemo(() => {
		const merged = new Map<number, Content>();
		for (const content of allContents) merged.set(content.id, content);
		for (const content of sceneContents) merged.set(content.id, content);
		return [...merged.values()];
	}, [allContents, sceneContents]);

	const [isUploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const groupedContents = {
		image: contents.filter((content) => content.type === "img"),
		sound: contents.filter((content) => content.type === "sound"),
		video: contents.filter((content) => content.type === "video"),
		text: contents.filter((content) => content.type === "text"),
		others: contents.filter(
			(content) => !["img", "sound", "video", "text", "capsule"].includes(content.type || "")
		)
	};

	const onDrop = async (files: File[]) => {
		setError(null);
		if (!files.length) return;

		setUploading(true);
		try {
			const formData = new FormData();
			for (const file of files) formData.append("files", file);

			const res = await fetch("/api/upload", {
				method: "POST",
				body: formData
			});

			if (!res.ok) {
				const message = await res.text();
				throw new Error(message || "Echec de l'upload");
			}

			const data = (await res.json()) as { files?: UploadItem[] };
			const uploadedFiles = data.files || [];
			for (const uploaded of uploadedFiles) {
				send({ type: "content-add", payload: uploaded.content });
			}

			if (sceneId) {
				for (const [index, uploaded] of uploadedFiles.entries()) {
					const sourceFile = files[index];
					if (!sourceFile) continue;
					if (uploaded.content.type !== "sound") continue;

					void processAudioCues({
						sourceFile,
						sceneId,
						contentId: uploaded.content.id,
						send,
						setError
					});
				}
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Erreur inattendue");
		} finally {
			setUploading(false);
		}
	};

	const { getRootProps, getInputProps, open, isDragActive, isDragReject } = useDropzone({
		onDrop,
		accept: ACCEPTED_TYPES,
		maxSize: 200 * 1024 * 1024,
		maxFiles: 20,
		disabled: isUploading,
		noClick: true,
		noKeyboard: true,
		onDropRejected: (rejections) => {
			const first = rejections[0]?.errors?.[0];
			setError(first?.message || "Depot refuse");
		}
	});

	return (
		<div
			{...getRootProps()}
			className={cn(
				"flex h-full min-h-0 w-full max-w-full min-w-0 flex-col overflow-hidden rounded-md border border-dashed transition-colors",
				isDragActive && "border-primary bg-primary/5",
				isDragReject && "border-red-500 bg-red-50"
			)}
		>
			<input {...getInputProps()} />
			<div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b bg-white/95 p-2 backdrop-blur">
				<p className="border-primary-500 border-b-2">Chutier</p>
				<Button type="button" size="icon-sm" variant="outline" onClick={() => open()} disabled={isUploading}>
					<Upload className="h-4 w-4" />
				</Button>
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-gutter:stable]">
				<div className="space-y-3">
					{isDragActive ? <p className="text-xs">Relachez les fichiers pour les importer</p> : null}
					{isUploading ? <p className="text-xs">Upload en cours...</p> : null}
					{error ? <p className="text-xs text-red-600">{error}</p> : null}

					<Tabs defaultValue="images" className="w-full min-w-0 text-xs">
						<TabsList className="grid h-auto w-full grid-cols-5">
							<TabsTrigger value="images">
								<Image />
							</TabsTrigger>
							<TabsTrigger value="sons">
								<Music />
							</TabsTrigger>
							<TabsTrigger value="videos">
								<Video />
							</TabsTrigger>
							<TabsTrigger value="textes">
								<FileText />
							</TabsTrigger>
							<TabsTrigger value="autres">
								<Shapes />
							</TabsTrigger>
						</TabsList>

						<TabsContent value="images">
							<ContentGroup items={groupedContents.image} emptyText="Aucune image" />
						</TabsContent>
						<TabsContent value="sons">
							<ContentGroup items={groupedContents.sound} emptyText="Aucun son" />
						</TabsContent>
						<TabsContent value="videos">
							<ContentGroup items={groupedContents.video} emptyText="Aucune video" />
						</TabsContent>
						<TabsContent value="textes">
							<ContentGroup items={groupedContents.text} emptyText="Aucun texte" />
						</TabsContent>
						<TabsContent value="autres">
							<ContentGroup items={groupedContents.others} emptyText="Aucun autre contenu" />
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}

async function processAudioCues({
	sourceFile,
	sceneId,
	contentId,
	send,
	setError
}: {
	sourceFile: File;
	sceneId: number;
	contentId: number;
	send: (event: { type: "scene-content-upsert"; payload: SceneContent }) => void;
	setError: (error: string | null) => void;
}) {
	try {
		const cues = await transcribeAudioFileToCues(sourceFile, { language: "fr" });
		const response = await fetch("/api/scene-content/cues", {
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json"
			},
			body: JSON.stringify({ sceneId, contentId, cues })
		});

		if (!response.ok) {
			const detail = await response.text();
			throw new Error(detail || "Echec persistence des cues");
		}

		const payload = (await response.json()) as {
			sceneContent?: Omit<SceneContent, "events"> & { events: TextTime[] };
		};

		if (payload.sceneContent) {
			send({ type: "scene-content-upsert", payload: payload.sceneContent });
		}
	} catch (error) {
		setError("Transcription Whisper echouee pour un son importe");
	}
}

function ContentGroup({ items, emptyText }: { items: Content[]; emptyText: string }) {
	return (
		<div className="min-w-0 rounded border p-2">
			{items.length ? (
				<ul className="mt-1 space-y-1">
					{items.map((content) => {
						const fullLabel =
							content.type === "text" ? content.inner || "(texte vide)" : content.name || "(sans nom)";
						const shortLabel = truncateWithEllipsis(fullLabel, 20);
						const Icon = getContentIcon(content.type);
						const dragPayload = toChutierDragPayload(content);

						return (
							<li
								key={content.id}
								className="flex min-w-0 cursor-grab items-center gap-2"
								title={fullLabel}
								draggable
								onDragStart={(event) => {
									event.dataTransfer.setData(CHUTIER_DRAG_MIME, JSON.stringify(dragPayload));
									event.dataTransfer.setData("text/plain", fullLabel);
									event.dataTransfer.effectAllowed = "copyMove";
								}}
							>
								<Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
								<span className="truncate">{shortLabel}</span>
							</li>
						);
					})}
				</ul>
			) : (
				<p className="text-muted-foreground mt-1">{emptyText}</p>
			)}
		</div>
	);
}

function truncateWithEllipsis(value: string, maxLength: number): string {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength)}...`;
}

function getContentIcon(type: string) {
	if (type === "img") return Image;
	if (type === "sound") return Music;
	if (type === "video") return Video;
	if (type === "text") return FileText;
	if (type === "lottie" || type === "rive" || type === "three3D") return Shapes;
	return File;
}
