import { createAuthClient } from "better-auth/react";
import { jwtClient } from "better-auth/client/plugins";

// No baseURL needed: the auth routes are on the same origin as the pages.
export const authClient = createAuthClient({
  plugins: [jwtClient()], // adds authClient.token()
});
