import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { DrillController } from './controllers/DrillController';

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

const drillController = new DrillController();

app.post('/api/optimize-drill', (req, res) => drillController.optimize(req, res));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
