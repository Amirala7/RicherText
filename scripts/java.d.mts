export type JavaFound = { java: string; home: string | null };

export function findJava(deps: {
  platform: NodeJS.Platform;
  env: Record<string, string | undefined>;
  listDir: (dir: string) => string[];
  isFile: (file: string) => boolean;
  javaMajor: (java: string) => number | null;
  run: (cmd: string, args: string[]) => string | null;
}): JavaFound | null;

export function findJavaHere(): JavaFound | null;
