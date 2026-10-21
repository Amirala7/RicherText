export const LISTEN_EVENTS: string[];

export function functionsSecretFile(
  env: Record<string, string | undefined>,
): string | null;

export function webhookUrl(projectId: string): string;

export function listenArgs(projectId: string): string[];

export function redactSecrets(text: string): string;
