import { config } from "dotenv";

config({ path: ".env" });

export const {
  PORT,
  DB_URI,
  PRIVATE_KEY_ENCRYPTION_KEY,
  REDIS_URL,
  BASE_URL,
  CLIENT_ORIGINS,
  EMAIL_PASSWORD,
  EMAIL_ID,
} = process.env;
