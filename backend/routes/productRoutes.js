import express from 'express';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getMerchantProducts,
  getAllProducts,
} from '../controllers/productController.js';
import { protect, merchant, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/all', protect, getAllProducts);

router.route('/')
  .get(protect, merchant, getProducts)
  .post(protect, merchant, createProduct);

router.route('/merchant/:merchantId')
  .get(protect, admin, getMerchantProducts);

router.route('/:id')
  .put(protect, merchant, updateProduct)
  .delete(protect, merchant, deleteProduct);

export default router;
