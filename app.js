import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { PORT } from "./config/env.js";
import connectToDatabase from "./database/mongodb.js";
import errorMiddleware from "./middleware/error.js";
import clientRoutes from "./routes/client.js";
import authRoutes from "./routes/auth.js";
import jwksRoutes from "./routes/jwks.js";

const app = express();

const allowedOrigins = [
  ...(process.env.CLIENT_ORIGINS?.split(",") || []),
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:4173",
]
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy does not allow this origin"));
    },
    credentials: false,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Client-API-Key"],
    exposedHeaders: ["Location"],
    maxAge: 600,
  })
);

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies
app.use(cookieParser()); // Parse cookies from request headers

// Routes
app.use("/clients", clientRoutes);
app.use("/auth", authRoutes);
app.use("/", jwksRoutes);

app.use(errorMiddleware); // Last middleware for error handling
app.get("/", (req, res) => {
  res.send("Welcome to MAuth API!");
});

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await connectToDatabase();
});
