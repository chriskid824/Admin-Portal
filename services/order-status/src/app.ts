// import express, cors, body-parser, and routes
import express from 'express';
import cors from 'cors';

import routes from './routes';
import auth from './auth';

const app = express();

// TODO: Review this later
const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(
  express.json({
    verify: (req, _, buf) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      req.rawBody = buf;
    },
  }),
);
app.use(auth);

routes(app);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log('Server running on port', port);
});
