const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { PrismaClient } = require("@prisma/client");

dotenv.config();
const app = express();
const prisma = new PrismaClient();

const authRoutes = require("./auth");
const poemRoutes = require("./poems");
const userRoutes = require("./users");

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/poems", poemRoutes);
app.use("/users", userRoutes);

app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});
