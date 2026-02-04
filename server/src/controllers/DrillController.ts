import { Request, Response } from 'express';
import { OptimizationService } from '../services/OptimizationService';
import { DrillState } from '../../../shared/types';

export class DrillController {
    private optimizationService: OptimizationService;

    constructor() {
        this.optimizationService = new OptimizationService();
    }

    public optimize(req: Request, res: Response): void {
        try {
            const drillState: DrillState = req.body;
            
            console.log('Receiving drill state for optimization...', drillState.players.length, 'players');
            
            const optimizedState = this.optimizationService.optimize(drillState);
            
            res.json(optimizedState);
        } catch (error) {
            console.error('Error optimizing drill:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
