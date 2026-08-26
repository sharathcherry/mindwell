# E2E Test Infra: MindWell Platform

## Test Philosophy
- Opaque-box, requirement-driven testing directly derived from `ORIGINAL_REQUEST.md`.
- Zero dependency on internal implementation details; interacts with HTTP APIs and client builds.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Interaction Testing + Real-World Application Workloads.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Persistent Database Layer & Schema | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Secure Production Auth & Token Lifecycle | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 3 | Route Protection & Resource APIs | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 4 | React Client Auth & Session Refresh | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 5 | React Client Data Layer Persistence | ORIGINAL_REQUEST §R1, R2 | 5 | 5 | ✓ |
| 6 | Production Rate Limiting | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 7 | Zod Request Schema Validation | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 8 | Hardened Crisis Triage & Safety Guardrails | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 9 | Security Headers & CORS | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 10 | Tier-1 Acoustic SER & Clinical Biomarkers | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 11 | Speech-to-Text & Offline Resilience | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 12 | Dynamic Multimodal AI Cascade & Fusion | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ |
| 13 | Single-Command Production Docker Packaging | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ |
| 14 | Automated Test Suite & Vite Build Compilation | ORIGINAL_REQUEST §Acceptance | 5 | 5 | ✓ |

## Test Architecture
- Test Runner: Native Node.js test runner / harness in `test/e2e-runner.js` + `run_smoke_tests.js`.
- Pass/Fail Semantics: Exit code 0 on all tests passing, non-zero on any failure.
- Execution speed target: < 30 seconds for full test suite.
- Test suites:
  - `server/test/run-api-tests.js`: API routes, Auth, JWT refresh, Rate limiting, Zod validation, Crisis triage, DB CRUD.
  - `python_audio/test_audio_endpoint.py`: PyTorch HuBERT SER, Acoustic Biomarkers, STT fallback, Health check.
  - `client/test/run-client-tests.js`: AuthContext, Storage/API adapters, Password hashing, Token interceptors.
  - `test/run-security-tests.js`: OWASP security headers, CORS rejection, unauthenticated route protection, rate limit threshold enforcement.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | New User Registration, Token Refresh & Protected Chat with Multimodal Telemetry | F1, F2, F3, F4, F10, F12 | High |
| 2 | Crisis Distress Detection, Sub-50ms Hotline Routing & Fail-Safe CBT Grounding | F3, F7, F8, F12 | High |
| 3 | Multi-Session Mood Tracking & Longitudinal Analytics Trend Generation | F1, F3, F5 | Medium |
| 4 | Rate Limit Threshold Stress & Malformed Schema Rejection | F6, F7, F9 | Medium |
| 5 | Offline Acoustic SER & Multimodal Dynamic Fallback Cascade Resilience | F10, F11, F12 | High |

## Coverage Thresholds
- Tier 1: ≥5 per feature (70+ test cases)
- Tier 2: ≥5 boundary/error cases per feature (70+ test cases)
- Tier 3: Pairwise coverage of major cross-feature interactions (14+ test cases)
- Tier 4: ≥5 realistic end-to-end user application workflows
