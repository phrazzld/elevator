/**
 * Unit tests for the examples library.
 * Validates structure, types, and content quality of prompt examples.
 */

import { describe, expect, it } from "vitest";
import {
  CORE_EXAMPLES,
  DOMAIN_EXAMPLES,
  type PromptExample,
} from "./examples.js";

describe("CORE_EXAMPLES", () => {
  it("should export at least 5 examples", () => {
    expect(CORE_EXAMPLES.length).toBeGreaterThanOrEqual(5);
  });

  it("should have valid PromptExample structure", () => {
    CORE_EXAMPLES.forEach((example) => {
      expect(example).toHaveProperty("input", expect.any(String));
      expect(example).toHaveProperty("output", expect.any(String));
      expect(example).toHaveProperty("techniques", expect.any(Array));

      // Validate content is not empty
      expect(example.input.trim()).not.toBe("");
      expect(example.output.trim()).not.toBe("");
      expect(example.techniques.length).toBeGreaterThan(0);

      // Each technique should be a non-empty string
      example.techniques.forEach((technique) => {
        expect(typeof technique).toBe("string");
        expect(technique.trim()).not.toBe("");
      });
    });
  });

  it("should demonstrate quality transformations", () => {
    CORE_EXAMPLES.forEach((example) => {
      // Output should be significantly more detailed than input
      expect(example.output.length).toBeGreaterThan(example.input.length * 2);

      // Output should contain structured elements
      const hasStructure =
        example.output.includes(":") ||
        example.output.includes("1)") ||
        example.output.includes("Format:");
      expect(hasStructure).toBe(true);
    });
  });

  it("should cover diverse prompt types", () => {
    const inputs = CORE_EXAMPLES.map((example) => example.input.toLowerCase());

    // Should cover various common request types
    const hasCodeHelp = inputs.some(
      (input) => input.includes("code") || input.includes("bug"),
    );
    const hasWriting = inputs.some(
      (input) => input.includes("write") || input.includes("document"),
    );
    const hasAnalysis = inputs.some(
      (input) => input.includes("analyze") || input.includes("data"),
    );
    const hasDesign = inputs.some(
      (input) => input.includes("design") || input.includes("create"),
    );

    expect(hasCodeHelp).toBe(true);
    expect(hasWriting).toBe(true);
    expect(hasAnalysis).toBe(true);
    expect(hasDesign).toBe(true);
  });

  it("should use consistent technique categorization", () => {
    const allTechniques = CORE_EXAMPLES.flatMap(
      (example) => example.techniques,
    );
    const uniqueTechniques = new Set(allTechniques);

    // Should have reasonable variety of techniques
    expect(uniqueTechniques.size).toBeGreaterThan(10);

    // Common techniques should appear multiple times
    const techniqueUsage = Array.from(uniqueTechniques).map((technique) => ({
      technique,
      count: allTechniques.filter((t) => t === technique).length,
    }));

    // At least some techniques should be reused across examples
    const reusedTechniques = techniqueUsage.filter(({ count }) => count > 1);
    expect(reusedTechniques.length).toBeGreaterThan(0);
  });
});

describe("DOMAIN_EXAMPLES", () => {
  it("should export domain-specific examples", () => {
    expect(DOMAIN_EXAMPLES).toHaveProperty("software_development");
    expect(DOMAIN_EXAMPLES).toHaveProperty("data_analysis");
    expect(DOMAIN_EXAMPLES).toHaveProperty("technical_writing");
  });

  it("should have valid structure for each domain", () => {
    Object.entries(DOMAIN_EXAMPLES).forEach(([, examples]) => {
      expect(Array.isArray(examples)).toBe(true);
      expect(examples.length).toBeGreaterThan(0);

      examples.forEach((example) => {
        expect(example).toHaveProperty("input", expect.any(String));
        expect(example).toHaveProperty("output", expect.any(String));
        expect(example).toHaveProperty("techniques", expect.any(Array));

        expect(example.input.trim()).not.toBe("");
        expect(example.output.trim()).not.toBe("");
        expect(example.techniques.length).toBeGreaterThan(0);
      });
    });
  });
});

describe("PromptExample interface", () => {
  it("should be properly typed", () => {
    const example: PromptExample = {
      input: "test input",
      output: "test output",
      techniques: ["test_technique"],
    };

    // Should be readonly - this test ensures TypeScript compilation
    expect(example.input).toBe("test input");
    expect(example.output).toBe("test output");
    expect(example.techniques).toEqual(["test_technique"]);
  });
});
