import { apiHandler, withScope } from "@devmentor/core";

export const GET = apiHandler(async () => withScope((cradle) => cradle.databaseHealthService.check()));
