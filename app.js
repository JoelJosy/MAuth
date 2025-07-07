import express from "express";
import { PORT } from "./config/env.js";
import connectToDatabase from "./database/mongodb.js";
import errorMiddleware from "./middleware/error.js";
import clientRoutes from "./routes/client.js";

const app = express();

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Routes
app.use("/clients", clientRoutes);

app.use(errorMiddleware); // Last middleware for error handling
app.get("/", (req, res) => {
  res.send("Welcome to MAuth API!");
});

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await connectToDatabase();
});
