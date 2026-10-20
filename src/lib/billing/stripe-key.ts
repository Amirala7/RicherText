// Sandbox only (ADR 0003): secret or restricted test-mode keys, never the
// placeholder from .env.example.
export function isSandboxKey(key: string | undefined): key is string {
  return !!key && /^(sk|rk)_test_/.test(key) && !key.includes("replace_me");
}
