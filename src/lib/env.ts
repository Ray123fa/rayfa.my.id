import { z } from "zod";
const schema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_REDIRECT_URI: z.url(),
  DEFAULT_ADMIN_EMAIL: z.email(),
  PUBLIC_SITE_URL: z.url(),
});
export function appEnv(value: AppEnv) {
  return schema.parse(value);
}
