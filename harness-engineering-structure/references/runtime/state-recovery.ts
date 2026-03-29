import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	rmSync,
	statSync,
} from "node:fs";
import path from "node:path";
import type { StateSnapshotRecord } from "./types";

const SNAPSHOT_DIR = path.join(".harness", "snapshots");
const STATE_FILE = path.join(".harness", "state.json");
const MAX_SNAPSHOTS = 20;

function snapshotDirectory(root: string): string {
	return path.join(root, SNAPSHOT_DIR);
}

function statePath(root: string): string {
	return path.join(root, STATE_FILE);
}

function snapshotTimestamp(date: Date): string {
	return date.toISOString().replace(/[:.]/g, "-");
}

function snapshotFileName(trigger: string, date: Date): string {
	const safeTrigger = trigger.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
	return `state-${snapshotTimestamp(date)}-${safeTrigger}.json`;
}

function parseSnapshotMetadata(fileName: string): {
	createdAt: string;
	trigger: string;
} | null {
	const match = fileName.match(/^state-([0-9TZ-]+)-([a-z0-9-]+)\.json$/i);
	if (!match) return null;
	const [, rawTimestamp, trigger] = match;
	const normalized = rawTimestamp.replace(
		/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3}Z)$/,
		"$1:$2:$3.$4",
	);
	return {
		createdAt: normalized,
		trigger,
	};
}

function trimSnapshots(root: string): void {
	const snapshots = listStateSnapshots(root);
	for (const snapshot of snapshots.slice(MAX_SNAPSHOTS)) {
		rmSync(path.join(root, snapshot.path), { force: true });
	}
}

export function listStateSnapshots(root: string): StateSnapshotRecord[] {
	const directory = snapshotDirectory(root);
	if (!existsSync(directory)) return [];
	return readdirSync(directory)
		.filter((fileName) => fileName.endsWith(".json"))
		.flatMap((fileName) => {
			const metadata = parseSnapshotMetadata(fileName);
			if (!metadata) return [];
			const absolutePath = path.join(directory, fileName);
			const stats = statSync(absolutePath);
			return [
				{
					fileName,
					path: path.join(SNAPSHOT_DIR, fileName).replace(/\\/g, "/"),
					createdAt: metadata.createdAt,
					trigger: metadata.trigger,
					sizeBytes: stats.size,
				},
			];
		})
		.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function createStateSnapshot(
	root: string,
	trigger: string,
): string | null {
	const source = statePath(root);
	if (!existsSync(source)) return null;
	const directory = snapshotDirectory(root);
	mkdirSync(directory, { recursive: true });
	const fileName = snapshotFileName(trigger, new Date());
	copyFileSync(source, path.join(directory, fileName));
	trimSnapshots(root);
	return path.join(SNAPSHOT_DIR, fileName).replace(/\\/g, "/");
}

export function recoverStateSnapshot(
	root: string,
	options?: { latest?: boolean; fileName?: string },
): StateSnapshotRecord | null {
	const snapshots = listStateSnapshots(root);
	const selected = options?.fileName
		? (snapshots.find((snapshot) => snapshot.fileName === options.fileName) ??
			null)
		: (snapshots[0] ?? null);
	if (!selected) return null;
	const source = path.join(root, selected.path);
	if (!existsSync(source)) return null;
	createStateSnapshot(root, "pre-recover");
	copyFileSync(source, statePath(root));
	return selected;
}
