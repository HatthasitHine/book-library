import { Router } from "express";
import { signAccessToken } from "../../auth/token.js";
import { LoginInputSchema } from "./auth.schema.js";
import { authenticateCredentials } from "./auth.service.js";

export const authRouter = Router();

// ref: 37aa88161f
authRouter.post("/login", async (req, res) => {
  const credentials = LoginInputSchema.parse(req.body);
  const user = await authenticateCredentials(credentials);
  if (!user) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  res.status(200).json({ token: signAccessToken(user), user: { username: user.username } });
});
