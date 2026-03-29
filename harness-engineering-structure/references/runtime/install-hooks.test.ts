import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { installHooks } from "./install-hooks";

const tempRoots: string[] = [];

function createTempRoot(): string {
	const root = mkdtempSync(path.join(os.tmpdir(), "harness-install-hooks-"));
	tempRoots.push(root);
	return root;
}

function seedHookSource(root: string): void {
	const hooksRoot = path.join(root, "harness/hooks");
	mkdirSync(hooksRoot, { recursive: true });
	writeFileSync(
		path.join(hooksRoot, "pre-commit"),
		"#!/usr/bin/env bash\nset -euo pipefail\necho ok\n",
	);
	writeFileSync(
		path.join(hooksRoot, "commit-msg"),
		"#!/usr/bin/env bash\nset -euo pipefail\nexit 0\n",
	);
}

describe("installHooks", () => {
	afterEach(() => {
		for (const root of tempRoots.splice(0)) {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("skips installation outside git repositories", () => {
		const root = createTempRoot();
		seedHookSource(root);

		expect(installHooks(root)).toBe(0);
		expect(existsSync(path.join(root, ".git/hooks"))).toBe(false);
	});

	it("installs hooks into the git hooks directory", () => {
		const root = createTempRoot();
		seedHookSource(root);
		execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });

		expect(installHooks(root)).toBe(0);

		const installedHook = path.join(root, ".git/hooks/pre-commit");
		expect(existsSync(installedHook)).toBe(true);
		expect(readFileSync(installedHook, "utf8")).toContain("set -euo pipefail");
		if (process.platform !== "win32") {
			expect(statSync(installedHook).mode & 0o111).not.toBe(0);
		}
	});
});
