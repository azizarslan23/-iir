const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("./middleware");
const prisma = new PrismaClient();
const router = express.Router();

router.get("/", async (req, res) => {
  const poems = await prisma.poem.findMany({ include: { author: true, comments: true } });
  res.json(poems);
});

router.post("/", authMiddleware, async (req, res) => {
  if (!req.user.approved) return res.status(403).json({ error: "Not approved to post poems" });
  const { title, content } = req.body;
  const poem = await prisma.poem.create({
    data: { title, content, authorId: req.user.id }
  });
  res.json(poem);
});

router.post("/:id/comment", authMiddleware, async (req, res) => {
  const { content } = req.body;
  const poemId = parseInt(req.params.id);
  const comment = await prisma.comment.create({
    data: { content, poemId, authorId: req.user.id }
  });
  res.json(comment);
});

module.exports = router;
