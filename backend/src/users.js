const express = require("express");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

router.post("/:id/approve", async (req, res) => {
  const id = parseInt(req.params.id);
  const user = await prisma.user.update({ where: { id }, data: { approved: true } });
  res.json(user);
});

module.exports = router;
