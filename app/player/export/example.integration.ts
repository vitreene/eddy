import { resolve } from "node:path";

import builderData from "@/player/examples/builder-data.json";
import { buildShellXmlBundleFromBuilder, writeBundleToDisk } from "@/player/export";

export async function runShellXmlExportExample() {
	const bundle = buildShellXmlBundleFromBuilder(builderData, {
		chapterId: "chapter1",
		pageId: "page1",
		language: "fr",
		courseTitle: "Exemple module",
		chapterTitle: "Chapitre 1",
		pageTitle: "Introduction"
	});

	const outputDir = resolve(process.cwd(), "tmp/shell-export-example");
	const writtenFiles = await writeBundleToDisk(bundle, outputDir);

	return {
		outputDir,
		writtenFiles,
		preview: bundle.files
	};
}

// Usage ponctuel en local:
// runShellXmlExportExample().then(console.log).catch(console.error);
