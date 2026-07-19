export const SERVER_READY_MESSAGE = "Book library server is up and ready to roll";

import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(`${SERVER_READY_MESSAGE} on port ${env.PORT}`);
});
