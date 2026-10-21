# 0014 — Test-driven development; tests are locked once written

- Status: accepted
- Date: 2026-10-19

## Context
I want business logic to stay consistent across the whole project, and want the tests to be what enforces it. Without a rule, tests tend to be written after the code and quietly adjusted whenever the code changes, so they stop guarding anything.

## Options considered
- **Tests after code** — faster at first; tests end up describing whatever the code does, bugs included.
- **TDD, tests freely editable** — test-first, but a failing test can still be "fixed" by changing the test.
- **TDD, tests locked once written** — test-first, and changing an existing test needs my explicit confirmation. Slower when requirements shift; the tests become the agreed specification.

## Decision
Everything in this project is built test-first (red → green → refactor):
1. Write the test(s) for the behaviour first and run them to see them fail for the right reason.
2. Write the smallest code that makes them pass; iterate on the **code** until they do.
3. Refactor with the tests green.

**Once a test is written it is locked.** Changing, weakening, skipping or deleting an existing test (assertions, fixtures, expected values, `.skip`/`.only`, loosened matchers) needs my explicit confirmation first, with the reason stated. Adding new tests needs no confirmation.

## Consequences
- Applies to all code: app, Cloud Functions, Firestore rules (rules tests on the emulator), shared Zod schemas, and end-to-end flows (Playwright). Design-only work (Phase 0 artifacts, docs) has nothing to test.
- When a test fails, the code is assumed wrong. If the test itself looks wrong, or a requirement changed, stop and ask; never edit the test to make it pass.
- Each vertical slice starts by agreeing what the tests check; commits put the tests first or alongside the code, never after it.
- Test tooling (Vitest, Playwright, emulator) has to be set up early in Phase 1, before any feature code.
- Not enforced by tooling for now. Whenever a change would touch an existing test, Claude tells me first, as a short plain-language summary (which test, what changes, e.g. "'math › adds': add(1, 2) should now be 5 (was 3)"; no code), and waits for confirmation. An enforcement hook is a next-steps candidate (CONTEXT §12).
- Definition of Done: the feature's tests were written first, and no existing test was changed without approval.
