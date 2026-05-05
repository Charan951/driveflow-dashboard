import express from 'express';
import {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogCategories,
  createBlogCategory,
  updateBlogCategory,
  deleteBlogCategory,
  getAdminBlogs,
  getAdminBlogCategories,
} from '../controllers/blogController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/categories', getBlogCategories);
router.get('/admin/all', protect, admin, getAdminBlogs);
router.get('/admin/categories', protect, admin, getAdminBlogCategories);
router.post('/categories', protect, admin, createBlogCategory);
router.put('/categories/:id', protect, admin, updateBlogCategory);
router.delete('/categories/:id', protect, admin, deleteBlogCategory);

router.route('/')
  .get(getBlogs)
  .post(protect, admin, createBlog);

router.route('/:id')
  .get(getBlogById)
  .put(protect, admin, updateBlog)
  .delete(protect, admin, deleteBlog);

export default router;
