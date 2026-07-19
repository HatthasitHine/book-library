export const SERVER_READY_MESSAGE = "Book library server is up and ready to roll";

import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "./app.js";
import { env } from "./config/env.js";

const invokedScript = process.argv[1] && resolve(process.argv[1]);
if (invokedScript === fileURLToPath(import.meta.url)) {
  app.listen(env.PORT, () => {
    console.log(`${SERVER_READY_MESSAGE} on port ${env.PORT}`);
  });
}
