import { config } from "dotenv";

config({ path: ".env" });

export const { PORT, DB_URI, PRIVATE_KEY_ENCRYPTION_KEY } = process.env;
