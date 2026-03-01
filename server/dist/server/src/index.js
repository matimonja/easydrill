"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const DrillController_1 = require("./controllers/DrillController");
const UserController_1 = require("./controllers/UserController");
const ExerciseController_1 = require("./controllers/ExerciseController");
const auth_1 = require("./middleware/auth");
const database_1 = require("./database");
const app = (0, express_1.default)();
const port = 3000;
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json({ limit: '10mb' }));
// Controllers
const drillController = new DrillController_1.DrillController();
const userController = new UserController_1.UserController();
const exerciseController = new ExerciseController_1.ExerciseController();
// ─── Public Routes ───────────────────────────────────────────────
// (none currently)
// ─── Protected Routes ────────────────────────────────────────────
// User profile
app.get('/api/me', auth_1.requireAuth, (req, res) => userController.getMe(req, res));
app.patch('/api/me', auth_1.requireAuth, (req, res) => userController.updateMe(req, res));
// Exercises CRUD
app.post('/api/exercises', auth_1.requireAuth, (req, res) => exerciseController.create(req, res));
app.get('/api/exercises', auth_1.requireAuth, (req, res) => exerciseController.list(req, res));
app.get('/api/exercises/:id', auth_1.requireAuth, (req, res) => exerciseController.getOne(req, res));
app.patch('/api/exercises/:id', auth_1.requireAuth, (req, res) => exerciseController.update(req, res));
app.delete('/api/exercises/:id', auth_1.requireAuth, (req, res) => exerciseController.remove(req, res));
// Drill optimization (now requires auth)
app.post('/api/optimize-drill', auth_1.requireAuth, (req, res) => drillController.optimize(req, res));
// Admin: change user plan
app.patch('/api/users/:id/plan', auth_1.requireAuth, (req, res) => userController.updatePlan(req, res));
function start() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, database_1.initDatabase)();
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    });
}
start().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
