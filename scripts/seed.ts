// Konta testowe: `npm run db:seed` (decyzja 2, tylko poza produkcją). Uruchamiane przez `tsx`.
import { closeContainer, parseEnv, withScope } from "@devmentor/core";
import { runSeed } from "./seed/run-seed.ts";

process.exitCode = await runSeed((line) => process.stdout.write(`${line}\n`), {
  appEnv: () => parseEnv().APP_ENV,
  createOperator: (input) => withScope((cradle) => cradle.seedService.createOperator(input)),
  createMentee: (input) => withScope((cradle) => cradle.seedService.createMentee(input)),
  createMentor: (input, grantedByEmail) => withScope((cradle) => cradle.seedService.createMentor(input, grantedByEmail)),
  close: closeContainer,
});
