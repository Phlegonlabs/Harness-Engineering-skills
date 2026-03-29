import { repoRoot } from "./shared";
import { listStateSnapshots, recoverStateSnapshot } from "./state-recovery";

if (import.meta.main) {
	const root = repoRoot();
	const args = process.argv.slice(2);

	if (args.includes("--list")) {
		const snapshots = listStateSnapshots(root);
		if (snapshots.length === 0) {
			console.log("No state snapshots available.");
			process.exit(0);
		}
		console.log("State Snapshots");
		for (const snapshot of snapshots) {
			console.log(
				`  ${snapshot.fileName} | ${snapshot.createdAt} | ${snapshot.sizeBytes} bytes | trigger=${snapshot.trigger}`,
			);
		}
		process.exit(0);
	}

	const latest = args.includes("--latest");
	const fileArgIndex = args.indexOf("--file");
	const fileName =
		fileArgIndex >= 0 && args.length > fileArgIndex + 1
			? args[fileArgIndex + 1]
			: undefined;

	if (!latest && !fileName) {
		console.error(
			"Usage: bun run harness:state-recover --list | --latest | --file <snapshot-file>",
		);
		process.exit(1);
	}

	const restored = recoverStateSnapshot(root, { latest, fileName });
	if (!restored) {
		console.error("No matching state snapshot found.");
		process.exit(1);
	}

	console.log(
		`Recovered .harness/state.json from ${restored.fileName} (${restored.createdAt}).`,
	);
}
