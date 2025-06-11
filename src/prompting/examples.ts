/**
 * Few-shot examples library for prompt transformation.
 *
 * Contains curated examples demonstrating high-quality prompt transformations
 * using state-of-the-art prompt engineering techniques.
 */

export interface PromptExample {
  readonly input: string;
  readonly output: string;
  readonly techniques: readonly string[];
}

/**
 * Core examples demonstrating prompt transformation patterns.
 * These examples showcase CRISP structure, specificity, and actionable outputs.
 */
export const CORE_EXAMPLES: readonly PromptExample[] = [
  {
    input: "fix my bug",
    output:
      "Debug [ERROR_TYPE] in [COMPONENT] (line X). Reproduce steps: [STEPS]. Expected vs actual behavior: [COMPARISON]. Provide: 1) Root cause analysis, 2) Fix with explanation, 3) Prevention strategy, 4) Test cases.",
    techniques: [
      "specificity",
      "structure",
      "validation",
      "debugging_methodology",
    ],
  },
  {
    input: "help with my code",
    output:
      "Review this [LANGUAGE] codebase for performance bottlenecks. Focus on: 1) Inefficient algorithms (O(n²)+), 2) Memory leaks, 3) Unnecessary operations. Provide specific line numbers and optimization suggestions. Format: Markdown with code snippets.",
    techniques: [
      "specificity",
      "structure",
      "format_specification",
      "actionable_outputs",
    ],
  },
  {
    input: "write about AI",
    output:
      "Create a 1200-word technical analysis of AI applications in [DOMAIN]. Structure: Executive summary (200w), Current state (400w), Emerging trends (400w), Implementation considerations (200w). Target audience: Technical decision-makers. Include 3+ case studies.",
    techniques: [
      "structure",
      "word_count",
      "audience_targeting",
      "content_requirements",
    ],
  },
  {
    input: "analyze this data",
    output:
      "Perform statistical analysis on [DATA_TYPE] dataset. Methodology: 1) Descriptive statistics with outlier detection, 2) Trend analysis using [METHOD], 3) Correlation matrix for key variables. Deliverables: Executive summary, detailed findings with visualizations, recommendations with confidence intervals. Format: PDF report with appendices.",
    techniques: [
      "methodology_specification",
      "deliverable_definition",
      "structure",
      "format_specification",
    ],
  },
  {
    input: "create a design",
    output:
      "Design [ARTIFACT] for [AUDIENCE]. Requirements: [SPECIFICATIONS]. Constraints: [TECHNICAL/BUSINESS_LIMITS]. Deliverables: 1) Wireframes/mockups, 2) Technical specifications, 3) Implementation timeline, 4) Success metrics. Format: Design system with documentation.",
    techniques: [
      "design_methodology",
      "constraint_specification",
      "structure",
      "success_metrics",
    ],
  },
  {
    input: "improve performance",
    output:
      "Optimize [SYSTEM/APPLICATION] performance for [SPECIFIC_METRICS]. Baseline: Current performance measurements. Target: [QUANTIFIED_GOALS]. Approach: 1) Performance profiling and bottleneck identification, 2) Implementation of optimizations, 3) A/B testing with statistical significance. Deliverables: Performance report, optimized code, monitoring dashboard.",
    techniques: [
      "quantified_goals",
      "baseline_establishment",
      "structure",
      "measurement_strategy",
    ],
  },
  {
    input: "write tests",
    output:
      "Develop comprehensive test suite for [COMPONENT/FEATURE]. Coverage: 1) Unit tests for individual functions (>95% coverage), 2) Integration tests for component interactions, 3) End-to-end tests for user workflows, 4) Performance tests for critical paths. Framework: [TEST_FRAMEWORK]. Include test data setup, teardown procedures, and CI/CD integration.",
    techniques: [
      "test_strategy",
      "coverage_requirements",
      "structure",
      "automation_planning",
    ],
  },
] as const;

/**
 * Domain-specific examples for specialized transformation patterns.
 * Can be used for context-aware prompt enhancement in future phases.
 */
export const DOMAIN_EXAMPLES = {
  software_development: [
    {
      input: "refactor this code",
      output:
        "Refactor [FILE/MODULE] following [PATTERN/PRINCIPLE]. Goals: 1) Improve maintainability and readability, 2) Reduce cyclomatic complexity, 3) Eliminate code duplication. Approach: Extract methods, apply SOLID principles, update tests. Deliverables: Refactored code, updated documentation, test coverage report.",
      techniques: [
        "refactoring_methodology",
        "quality_metrics",
        "principle_application",
      ],
    },
  ],
  data_analysis: [
    {
      input: "find insights in data",
      output:
        "Conduct exploratory data analysis on [DATASET] to identify actionable insights for [BUSINESS_OBJECTIVE]. Methods: 1) Data quality assessment, 2) Statistical profiling, 3) Pattern recognition, 4) Hypothesis testing. Deliverables: Data quality report, statistical summary, insights presentation with recommendations.",
      techniques: [
        "exploratory_analysis",
        "business_alignment",
        "statistical_methods",
      ],
    },
  ],
  technical_writing: [
    {
      input: "document this feature",
      output:
        "Create comprehensive documentation for [FEATURE/API]. Audience: [DEVELOPERS/USERS]. Structure: 1) Overview and use cases, 2) API reference with examples, 3) Integration guide, 4) Troubleshooting section. Format: Interactive documentation with code samples and live examples.",
      techniques: [
        "audience_specification",
        "comprehensive_structure",
        "interactive_elements",
      ],
    },
  ],
} as const;
