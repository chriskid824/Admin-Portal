import express from 'express';

const router = express.Router();

router.get('/', (req, res, next) => {
  res.json({
    version: '1.0.0',
  });
});

export default router;
