# 0018 — Local first: build on the Firebase emulators, deploy only when finalised

- Status: accepted
- Date: 2026-10-20

## Context
ADR 0002 already says local development runs on the Firebase Emulator Suite. The user set the order explicitly for Phase 1 onwards: start with local Firebase, make everything work locally, and only deploy to a real Firebase project once it is finalised.

## Decision
- All building and testing happens against the Emulator Suite (Auth, Firestore, Functions), using a `demo-` project id so no real Firebase project is needed.
- Stripe runs in its sandbox, with webhooks forwarded to the Functions emulator by the Stripe CLI (ADR 0003).
- The real Firebase project, App Hosting setup and the deploy script come at the end, in the launch phase, once the app is finalised locally.

## Consequences
- Phase 1 sets up the emulators, not a cloud project.
- "Done" for every feature already means "works end-to-end on the emulators" (Definition of Done); nothing is deployed feature by feature.
- **OPEN:** until a GCP project exists, where do the local Stripe sandbox keys live? Proposal: in the gitignored `.env.local`, typed in by hand, and moved to Secret Manager (ADR 0009) when the project is created.
