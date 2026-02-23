import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { DrillController } from './controllers/DrillController';
import { UserController } from './controllers/UserController';
import { requireAuth } from './middleware/auth';
import { getDb } from './database';

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Initialize database on startup
getDb();

// Controllers
const drillController = new DrillController();
const userController = new UserController();

// ─── Public Routes ───────────────────────────────────────────────
// (none currently)

// ─── Protected Routes ────────────────────────────────────────────

// User profile
app.get('/api/me', requireAuth, (req, res) => userController.getMe(req, res));
app.patch('/api/me', requireAuth, (req, res) => userController.updateMe(req, res));

// Drill optimization (now requires auth)
app.post('/api/optimize-drill', requireAuth, (req, res) => drillController.optimize(req, res));

// Admin: change user plan
app.patch('/api/users/:id/plan', requireAuth, (req, res) => userController.updatePlan(req, res));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
