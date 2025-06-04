# elevator CLI - MVP Implementation Tasks

## Project Foundation & Automation

### Core Project Setup

- [x] Initialize Node.js project with TypeScript support
- [x] Configure `package.json` with bin field for global CLI installation
- [x] Set up strict TypeScript configuration (`tsconfig.json`) with `"strict": true`
- [x] Configure ESLint with TypeScript rules (recommended + recommended-requiring-type-checking)
- [x] Configure Prettier for formatting (non-negotiable, zero-config approach)
- [x] Set up Vitest as testing framework
- [x] Create `.gitignore` with Node.js and IDE patterns
- [x] Create `.env.example` with `GEMINI_API_KEY` placeholder

### Mandatory Automation

- [x] Set up pre-commit hooks with lint, format, and type check
- [x] Configure GitHub Actions CI pipeline (lint → typecheck → test → build)
- [x] Add npm audit for dependency vulnerability scanning in CI
- [x] Set up test coverage enforcement (85% minimum threshold)
- [x] Configure Conventional Commits validation in pre-commit hooks

## Core Domain Logic (Pure Functions)

### Configuration Module (`src/config.ts`)

- [x] Define strict configuration interface with readonly properties
- [x] Implement environment variable validation with explicit error messages
- [x] Create configuration factory function (pure, testable)
- [x] Add default values for model ID and temperature
- [x] Export typed, immutable configuration object

### Prompt Processing Core (`src/core/promptProcessor.ts`)

- [x] Define prompt processing interface (input/output contracts)
- [x] Implement prompt validation logic (pure function)
- [x] Create prompt enhancement logic as pure function
- [x] Define error types for validation failures
- [x] Add comprehensive unit tests for all pure functions

## Infrastructure Adapters

### Gemini API Client (`src/adapters/geminiClient.ts`)

- [x] Create Gemini API interface (defined by core, not Google SDK)
- [x] Implement Google Generative AI client adapter
- [x] Add retry logic with exponential backoff (max 3 attempts)
- [x] Handle rate limiting and safety blocks appropriately
- [x] Add timeout handling for API calls
- [x] Create comprehensive error mapping to domain errors

### Output Formatter (`src/adapters/formatter.ts`)

- [x] Create formatter interface (defined by core)
- [x] Implement console output formatter with chalk
- [x] Add progress indicator for "thinking" state
- [x] Support raw output mode (no formatting)
- [x] Handle streaming vs non-streaming output rendering

## CLI Interface & REPL

### CLI Entry Point (`src/cli.ts`)

- [x] Set up commander for argument parsing
- [x] Define CLI flags: --model, --temp, --stream, --raw
- [x] Map CLI flags to environment variable fallbacks
- [x] Add version and help support
- [x] Implement dependency injection setup (wire adapters to core)

### REPL Implementation (`src/repl/repl.ts`)

- [ ] Create REPL interface and implementation
- [ ] Set up readline for interactive input
- [ ] Handle user input processing through core domain logic
- [ ] Implement exit commands (exit, quit, Ctrl+C gracefully)
- [ ] Add welcome and goodbye messages
- [ ] Ensure proper error handling and display

## Error Handling & Security

### Domain Error Types (`src/core/errors.ts`)

- [ ] Define custom error classes for different failure scenarios
- [ ] Create network error, validation error, and API error types
- [ ] Implement error serialization for logging
- [ ] Add proper error messages for user-facing scenarios

### Security Implementation

- [ ] Validate API key presence on startup with actionable error message
- [ ] Ensure API key is only read from environment variables
- [ ] Add input sanitization before API calls
- [ ] Prevent credential logging in any output

## Logging & Observability

### Structured Logging (`src/infrastructure/logger.ts`)

- [ ] Set up pino for structured JSON logging
- [ ] Configure log levels via environment variables
- [ ] Add correlation ID generation and propagation
- [ ] Include mandatory context fields (timestamp, level, service_name, correlation_id)
- [ ] Implement contextual logger injection

## Testing Strategy

### Unit Tests

- [ ] Set up Vitest configuration with coverage reporting
- [ ] Write comprehensive tests for core domain logic (100% coverage target)
- [ ] Test configuration module with various environment scenarios
- [ ] Test prompt processing with edge cases and validation scenarios
- [ ] Test error handling and error type creation

### Integration Tests

- [ ] Create integration tests for Gemini adapter with mock API responses
- [ ] Test CLI argument parsing and flag combinations
- [ ] Test REPL loop with simulated user input
- [ ] Test end-to-end workflow with mocked external dependencies only

### Test Infrastructure

- [ ] Create test data builders for consistent test setup
- [ ] Set up test fixtures for API responses
- [ ] Configure test coverage enforcement in CI
- [ ] Add test utilities for dependency injection in tests

## Build & Distribution

### Build Configuration

- [ ] Configure TypeScript compilation for production
- [ ] Set up build script with proper error handling
- [ ] Add clean script for build artifacts
- [ ] Configure source maps for debugging

### NPM Package Preparation

- [ ] Configure package.json for npm publishing
- [ ] Set up bin field for global CLI installation
- [ ] Define files to include in published package
- [ ] Add keywords and metadata for discoverability
- [ ] Test local npm installation and global command execution

## Documentation (Essential Only)

### User Documentation

- [ ] Create comprehensive README.md with installation and usage
- [ ] Document all CLI flags and environment variables
- [ ] Add troubleshooting section with common issues
- [ ] Include API key setup instructions

### Developer Documentation

- [ ] Document architecture decisions and core design principles
- [ ] Add contribution guidelines referencing development philosophy
- [ ] Create API documentation for core interfaces
- [ ] Document testing strategy and coverage requirements
