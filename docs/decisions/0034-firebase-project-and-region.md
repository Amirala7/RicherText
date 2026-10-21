# 0034 — Real Firebase project and region

- Status: accepted (builds on 0002, 0018)
- Date: 2026-10-21

## Context
ADR 0018 keeps all work on the emulators (`demo-richertext`) until the app is finalised. The user created the real Firebase project on 2026-10-21: name `richer-text`, id `richer-text-55ffe`. Its default resource location was not set yet. The Firestore location can never be changed after the database is created, and the Functions region was open (CONTEXT §11).

## Decision
- Real project: `richer-text-55ffe`, to be added to `.firebaserc` as the `prod` alias in the Phase 6 deploy slice. The emulators keep `demo-richertext` as the default.
- Region: **`europe-west1`** (Belgium) for Firestore and Cloud Functions (user, to match their other projects in `europe-west`).
- App Hosting backend `richertext` in **`europe-west4`** (Netherlands): App Hosting refused `europe-west1` ("location not found", 2026-10-21), so the nearest EU region. Address: `https://richertext--richer-text-55ffe.europe-west4.hosted.app`. Created without a GitHub connection; deploys come from the local script only (ADR 0018).

## Consequences
- Firestore must be created in `europe-west1` (Console or CLI) before the first deploy; picking another location by mistake can't be undone.
- Functions code sets `region: "europe-west1"`; the emulator tests and webhook URL follow it (Phase 6 deploy slice).
- Data stays in the EU. The app server and Firestore sit in neighbouring regions, a few ms apart.
- Firestore `(default)` created in `europe-west1` by the user (2026-10-21); the hosted.app address is an Auth authorized domain.
