import type { SetupStep } from "../types.ts";

/** Musi odpowiadać `engines.node` w głównym `package.json` (pilnuje tego test). */
export const MIN_NODE_VERSION = "22.17.0";

const MANUAL_STEPS = "wykonaj ręczne kroki z README → „Uruchomienie lokalne”";

export const platformStep: SetupStep = {
  name: "Platforma",
  async run({ system }) {
    if (system.platform === "win32") {
      return { status: "failed", message: `Windows nie jest obsługiwany przez instalator — ${MANUAL_STEPS}.` };
    }
    return { status: "done", message: `${system.platform} jest obsługiwana` };
  },
};

export const nodeVersionStep: SetupStep = {
  name: "Node.js",
  async run({ system }) {
    if (compareVersions(system.nodeVersion, MIN_NODE_VERSION) < 0) {
      return {
        status: "failed",
        message: `wymagany Node.js ${MIN_NODE_VERSION} lub nowszy, zainstalowany: ${system.nodeVersion}.`,
      };
    }
    return { status: "done", message: `wersja ${system.nodeVersion}` };
  },
};

/** Porównuje wersje `x.y.z` liczbowo; zwraca liczbę ujemną, zero albo dodatnią. */
export function compareVersions(left: string, right: string): number {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
