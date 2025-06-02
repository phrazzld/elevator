# Line 51 Plan: Create Comprehensive Error Mapping to Domain Errors

## Task Overview

Enhance the existing error mapping in `src/adapters/geminiClient.ts` to provide comprehensive mapping from Google SDK errors to domain errors, following the error handling principles outlined in DEVELOPMENT_PHILOSOPHY.md.

## Analysis of Current State

The `mapError()` function already handles basic error mapping with categories:

- Authentication errors (`AUTHENTICATION_FAILED`)
- Rate limiting (`RATE_LIMITED`) with retry delay extraction
- Quota errors (`QUOTA_EXCEEDED`)
- Timeout errors (`TIMEOUT`)
- Network errors (`NETWORK_ERROR`)
- Model not found (`MODEL_NOT_FOUND`)
- Invalid request (`INVALID_REQUEST`)
- Server errors (`SERVER_ERROR`)
- Content filtering (`CONTENT_FILTERED`)
- Unknown errors (`UNKNOWN_ERROR`)

## Implementation Approach

### 1. Enhance Error Type Definitions

- Review and potentially extend APIError types in `src/core/apiClient.ts`
- Ensure all domain error categories are properly defined
- Add missing error types if needed (e.g., `CONFIGURATION_ERROR`, `SERVICE_UNAVAILABLE`)

### 2. Improve Error Detection Patterns

- Expand error message pattern matching for more reliable error categorization
- Add detection for additional Google SDK error scenarios
- Enhance HTTP status code mapping
- Improve safety and recitation error handling

### 3. Standardize Error Context

- Ensure consistent error metadata across all error types
- Improve retry-ability determination logic
- Enhance error message clarity while avoiding sensitive information leakage
- Add structured error details for debugging

### 4. Validate Comprehensive Coverage

- Review Google Generative AI SDK documentation for all possible error scenarios
- Ensure no error types are missed in mapping
- Test error mapping with various scenarios

## Adherence to Development Philosophy

- **Explicit Error Handling**: Clear mapping between SDK errors and domain errors
- **Consistency**: Standardized error structure and categorization
- **Security**: No sensitive information leakage in error messages
- **Maintainability**: Well-structured, testable error mapping logic

## Expected Outcome

A robust, comprehensive error mapping system that reliably translates all possible Google SDK errors into appropriate domain errors with consistent structure, clear messages, and proper retry-ability determination.
