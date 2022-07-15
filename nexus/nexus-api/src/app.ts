// import express, cors, body-parser, and routes
import express from 'express';
import cors from 'cors';

import routes from './routes';

import { processFromFile } from './scripts/fetchGoat';
const app = express();

// TODO: Review this later
const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.post('/fetchGoatPrices', (req, res) => {
  console.log('trigger fetchGoat');
  processFromFile('./goat-top.txt');
  res.send('getchGoat success');
});

routes(app);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Server running on port', port);
});
