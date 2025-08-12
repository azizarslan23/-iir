const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('./routes/auth');
const poemRoutes = require('./routes/poems');

dotenv.config();
const prisma = new PrismaClient();
const app = express();

app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173', credentials: true }));
app.set('trust proxy', 1);

const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use(limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/poems', poemRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on port ${port}`));
