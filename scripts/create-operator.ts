// Konto operatora: `npm run operator:create` (spec E01 → API Contracts „CLI”). Uruchamiane przez `tsx`.
import { closeContainer, withScope } from "@devmentor/core";
import { runCreateOperator } from "./operator/run-create-operator.ts";
import { createTerminal } from "./operator/terminal.ts";

process.exitCode = await runCreateOperator(process.argv.slice(2), createTerminal(process.stdin, process.stdout), {
  createOperator: (input) => withScope((cradle) => cradle.accountService.createOperator(input)),
  close: closeContainer,
});
