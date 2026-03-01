"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrillController = void 0;
const OptimizationService_1 = require("../services/OptimizationService");
class DrillController {
    constructor() {
        this.optimizationService = new OptimizationService_1.OptimizationService();
    }
    optimize(req, res) {
        try {
            const drillState = req.body;
            console.log('Receiving drill state for optimization...', drillState.players.length, 'players');
            const optimizedState = this.optimizationService.optimize(drillState);
            res.json(optimizedState);
        }
        catch (error) {
            console.error('Error optimizing drill:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
exports.DrillController = DrillController;
