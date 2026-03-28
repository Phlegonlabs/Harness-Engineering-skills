import { describe, expect, test } from "bun:test";
import { createWorkspaceGreeting } from "./greeting";

describe("createWorkspaceGreeting", () => {
	test("should return a stable workspace marker", () => {
		expect(createWorkspaceGreeting("shared")).toBe("workspace:shared");
	});
});
