import express from "express";
import { PORT } from "./config/env.js";
import { connect } from "mongoose";
import connectToDatabase from "./database/mongodb.js";

const app = express();

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, async () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  //   await connectToDatabase();
});
