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

app.use(
  cors({
    origin: true,
    credentials: true, // Allow cookies to be sent
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
