import { Router } from 'express';
import { analyzeWeeklyCheckIn } from '../controllers/wellnessController.js';

const router = Router();

// Endpoint for processing wellness assessment
router.post('/check-ins/analyze', analyzeWeeklyCheckIn);

export default router;
