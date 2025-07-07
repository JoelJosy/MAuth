import { createClient } from "redis";
import { REDIS_URL } from "./env.js";

// Create Redis client
const client = createClient({
  url: REDIS_URL,
});

client.on("error", function (err) {
  console.error("Redis Client Error:", err);
});

// Connect to Redis
await client.connect();

export default client;
