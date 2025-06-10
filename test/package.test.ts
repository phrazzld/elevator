import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
);

describe("package.json configuration", () => {
  it("should have bin property pointing to dist/cli.js", () => {
    expect(packageJson.bin).toBeDefined();
    expect(packageJson.bin).toEqual({
      "prompt-elevator": "dist/cli.js",
    });
  });

  it("should include dist/ directory and exclude src/ directory in files array", () => {
    expect(packageJson.files).toBeDefined();
    expect(Array.isArray(packageJson.files)).toBe(true);

    // Should include dist/ files
    const hasDistFiles = packageJson.files.some(
      (file: string) => file.startsWith("dist/") || file.includes("dist/**"),
    );
    expect(hasDistFiles).toBe(true);

    // Should NOT include src/ files
    const hasSrcFiles = packageJson.files.some(
      (file: string) => file.startsWith("src/") || file.includes("src/**"),
    );
    expect(hasSrcFiles).toBe(false);
  });

  it("should have correct package name", () => {
    expect(packageJson.name).toBe("prompt-elevator");
  });

  it("should have correct main entry point", () => {
    expect(packageJson.main).toBe("dist/cli.js");
  });

  it("should have publishConfig with public access and provenance", () => {
    expect(packageJson.publishConfig).toBeDefined();
    expect(packageJson.publishConfig.access).toBe("public");
    expect(packageJson.publishConfig.provenance).toBe(true);
  });

  it("should have required metadata fields", () => {
    expect(packageJson.version).toBeDefined();
    expect(packageJson.description).toBeDefined();
    expect(packageJson.license).toBeDefined();
    expect(packageJson.repository).toBeDefined();
    expect(packageJson.keywords).toBeDefined();
    expect(Array.isArray(packageJson.keywords)).toBe(true);
  });

  it("should have Node.js engine requirement", () => {
    expect(packageJson.engines).toBeDefined();
    expect(packageJson.engines.node).toBeDefined();
    expect(packageJson.engines.node).toMatch(/>=\d+\.\d+\.\d+/);
  });
});
