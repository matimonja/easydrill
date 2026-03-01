import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { DrillController } from './controllers/DrillController';
import { UserController } from './controllers/UserController';
import { ExerciseController } from './controllers/ExerciseController';
import { requireAuth } from './middleware/auth';
import { initDatabase } from './database';

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Controllers
const drillController = new DrillController();
const userController = new UserController();
const exerciseController = new ExerciseController();

// ─── Public Routes ───────────────────────────────────────────────
app.get('/health', (_req, res) => res.status(200).send('OK'));

// ─── Protected Routes ────────────────────────────────────────────

// User profile
app.get('/api/me', requireAuth, (req, res) => userController.getMe(req, res));
app.patch('/api/me', requireAuth, (req, res) => userController.updateMe(req, res));

// Exercises CRUD
app.post('/api/exercises', requireAuth, (req, res) => exerciseController.create(req, res));
app.get('/api/exercises', requireAuth, (req, res) => exerciseController.list(req, res));
app.get('/api/exercises/:id', requireAuth, (req, res) => exerciseController.getOne(req, res));
app.patch('/api/exercises/:id', requireAuth, (req, res) => exerciseController.update(req, res));
app.delete('/api/exercises/:id', requireAuth, (req, res) => exerciseController.remove(req, res));

// Drill optimization (now requires auth)
app.post('/api/optimize-drill', requireAuth, (req, res) => drillController.optimize(req, res));

// Admin: change user plan
app.patch('/api/users/:id/plan', requireAuth, (req, res) => userController.updatePlan(req, res));

async function start() {
  await initDatabase();
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
