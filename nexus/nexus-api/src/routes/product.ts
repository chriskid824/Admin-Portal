import express from 'express';
import { Product } from '../models/product';
import { resourceLimits } from 'worker_threads';
import multer from 'multer';
import path from 'path';
const router = express.Router();
router.get('/:modelNumber', async (req, res) => {
  const modelNumber = req.params['modelNumber'];
  res.json({
    status: 'ok',
    data: modelNumber,
  });
});

router.post('/:modelNumber/updateImages', async (req, res) => {
  const modelNumber = req.params['modelNumber'];
  const json = req.body;
  const imageUrls = Array.isArray(json) ? json : [];
  const product = Product.createWithImageUrls(modelNumber, imageUrls);
  await product.save(modelNumber);
  await product.republishImagesToSink();
  res.json({
    status: 'ok',
  });
});

router.get('/:modelNumber/allSourceImages', async (req, res) => {
  const modelNumber = req.params['modelNumber'];
  const product = new Product(modelNumber);
  const images = await product.fetchAllSourceImagePaths();
  res.json({
    status: 'ok',
    data: images,
  });
});

router.get('/:modelNumber/allSourceImageUrls', async (req, res) => {
  const modelNumber = req.params['modelNumber'];
  const product = new Product(modelNumber);
  const images = await product.fetchAllSourceImageUrls();
  res.json({
    status: 'ok',
    data: images,
  });
});

router.get('/:modelNumber/imageUrls', async (req, res) => {
  const modelNumber = req.params['modelNumber'];
  const product = await Product.findByModelNumber(modelNumber);
  const images = product.imageUrls;
  res.json({
    status: 'ok',
    data: images,
  });
});

router.post('/:modelNumber/syncImages', async (req, res) => {
  const modelNumber = req.params['modelNumber'];
  const product = await Product.findByModelNumber(modelNumber);
  await product.republishImagesToSink();
  res.json({
    status: 'ok',
  });
});
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  // limits: { fileSize: 10 * 1000 * 1000 },
  fileFilter: (req, file, callback) => {
    const acceptableExtensions = ['.gif', '.jpeg', '.png', '.jpg'];
    if (!acceptableExtensions.includes(path.extname(file.originalname))) {
      return callback(new Error('only accept imgae'));
    }
    callback(null, true);
  },
});
router.post(
  '/:modelNumber/uploadImages',
  upload.single('file'),
  async (req, res) => {
    const modelNumber = req.params['modelNumber'];
    const product = await Product.findByModelNumber(modelNumber);
    const file = req.file as Express.Multer.File;
    const result = await product.uploadImage(
      file.originalname,
      file.buffer,
      JSON.parse(req.body.product),
    );
    res.json(result);
  },
);
export default router;
