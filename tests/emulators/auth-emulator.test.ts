import { describe, expect, it } from "vitest";

// The Auth emulator is up on the agreed port for the demo project.
const url = "http://127.0.0.1:9099/emulator/v1/projects/demo-richertext/config";

describe("auth emulator", () => {
  it("is reachable for the demo project", async () => {
    const res = await fetch(url);
    expect(res.status).toBe(200);
  });
});
