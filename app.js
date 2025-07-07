import express from "express";
import { PORT } from "./config/env.js";
import { connect } from "mongoose";
import connectToDatabase from "./database/mongodb.js";
import errorMiddleware from "./middleware/error.js";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.use(errorMiddleware); // Last middleware for error handling
app.get("/", (req, res) => {
  res.send("Welcome to MAuth API!");
});

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  await connectToDatabase();
});
