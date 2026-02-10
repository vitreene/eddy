import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";
import { useMemo } from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";

type DropzoneProps = {
	accept?: Accept;
	maxSize?: number;
	maxFiles?: number;
	disabled?: boolean;
	className?: string;
	onDrop: (files: File[]) => void | Promise<void>;
	onError?: (message: string) => void;
};

export function Dropzone({
	accept,
	maxSize,
	maxFiles = 20,
	disabled,
	className,
	onDrop,
	onError
}: DropzoneProps) {
	const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
		accept,
		maxSize,
		maxFiles,
		disabled,
		onDrop,
		onDropRejected: (rejections: FileRejection[]) => {
			const first = rejections[0]?.errors?.[0];
			onError?.(first?.message || "Depot refuse");
		}
	});

	const hint = useMemo(() => {
		if (isDragReject) return "Type de fichier non accepte";
		if (isDragActive) return "Relachez pour importer";
		return "Glissez-deposez des fichiers ou cliquez pour parcourir";
	}, [isDragActive, isDragReject]);

	return (
		<div
			{...getRootProps()}
			className={cn(
				"rounded-md border border-dashed p-4 text-center text-xs transition-colors",
				isDragActive && "border-primary bg-primary/5",
				isDragReject && "border-red-500 bg-red-50",
				disabled && "pointer-events-none opacity-60",
				className
			)}
		>
			<input {...getInputProps()} />
			<div className="flex flex-col items-center gap-2">
				<Upload className="h-4 w-4" />
				<p>{hint}</p>
			</div>
		</div>
	);
}
