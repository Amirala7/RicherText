import { onRequest } from "firebase-functions/v2/https";

// Smoke check that the Functions emulator loads this package.
export const health = onRequest((_req, res) => {
  res.json({ ok: true });
});
