import BlogPost from '../models/BlogPost.js';
import BlogCategory from '../models/BlogCategory.js';
import { emitEntitySync } from '../utils/syncService.js';
import { validateBlogPost, validateBlogCategory } from '../utils/validation.js';

const toTrimmedString = (value = '') => String(value).trim();

// @desc    Get all active blog categories
// @route   GET /api/blogs/categories
// @access  Public
export const getBlogCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.find({ isActive: true }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all blogs
// @route   GET /api/blogs
// @access  Public
export const getBlogs = async (req, res) => {
  try {
    const { category, search } = req.query;
    const query = { isPublished: true };

    if (category) {
      const categoryDoc = await BlogCategory.findOne({ name: category, isActive: true });
      query.category = categoryDoc ? categoryDoc._id : null;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const blogs = await BlogPost.find(query)
      .populate('category', 'name')
      .sort({ publishedAt: -1, createdAt: -1 });

    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get blog by id
// @route   GET /api/blogs/:id
// @access  Public
export const getBlogById = async (req, res) => {
  try {
    const blog = await BlogPost.findById(req.params.id).populate('category', 'name');
    if (!blog || !blog.isPublished) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    res.status(404).json({ message: 'Blog not found' });
  }
};

// @desc    Get all blogs for admin
// @route   GET /api/blogs/admin/all
// @access  Private/Admin
export const getAdminBlogs = async (req, res) => {
  try {
    const blogs = await BlogPost.find({})
      .populate('category', 'name')
      .sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all categories for admin
// @route   GET /api/blogs/admin/categories
// @access  Private/Admin
export const getAdminBlogCategories = async (req, res) => {
  try {
    const categories = await BlogCategory.find({}).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create blog category
// @route   POST /api/blogs/categories
// @access  Private/Admin
export const createBlogCategory = async (req, res) => {
  try {
    const validation = validateBlogCategory(req.body);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }
    const name = toTrimmedString(req.body.name);
    const description = toTrimmedString(req.body.description);

    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existing = await BlogCategory.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await BlogCategory.create({ name, description });
    emitEntitySync('blogCategory', 'created', category);
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update blog category
// @route   PUT /api/blogs/categories/:id
// @access  Private/Admin
export const updateBlogCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (req.body.name !== undefined || req.body.description !== undefined) {
      const validation = validateBlogCategory(req.body);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }
    }

    if (req.body.name !== undefined) {
      const nextName = toTrimmedString(req.body.name);
      if (!nextName) {
        return res.status(400).json({ message: 'Category name is required' });
      }

      const existing = await BlogCategory.findOne({ name: nextName, _id: { $ne: category._id } });
      if (existing) {
        return res.status(400).json({ message: 'Category already exists' });
      }
      category.name = nextName;
    }

    if (req.body.description !== undefined) {
      category.description = toTrimmedString(req.body.description);
    }
    if (req.body.isActive !== undefined) {
      category.isActive = Boolean(req.body.isActive);
    }

    const updated = await category.save();
    emitEntitySync('blogCategory', 'updated', updated);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete blog category
// @route   DELETE /api/blogs/categories/:id
// @access  Private/Admin
export const deleteBlogCategory = async (req, res) => {
  try {
    const category = await BlogCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const usedCount = await BlogPost.countDocuments({ category: category._id });
    if (usedCount > 0) {
      return res.status(400).json({ message: 'Cannot delete category with existing blogs' });
    }

    await category.deleteOne();
    emitEntitySync('blogCategory', 'deleted', { _id: req.params.id });
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create blog post
// @route   POST /api/blogs
// @access  Private/Admin
export const createBlog = async (req, res) => {
  try {
    const validation = validateBlogPost(req.body);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }
    const { title, excerpt, content, image, category, author, isPublished, tags, readTime } = req.body;

    const categoryDoc = await BlogCategory.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    const blog = await BlogPost.create({
      title: toTrimmedString(title),
      excerpt: toTrimmedString(excerpt),
      content: toTrimmedString(content),
      image: toTrimmedString(image),
      category,
      author: toTrimmedString(author) || toTrimmedString(req.user?.name) || 'Admin',
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
      publishedAt: new Date(),
      tags: Array.isArray(tags) ? tags.map((tag) => toTrimmedString(tag)).filter(Boolean) : [],
      readTime: toTrimmedString(readTime),
    });

    const created = await BlogPost.findById(blog._id).populate('category', 'name');
    emitEntitySync('blog', 'created', created);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update blog post
// @route   PUT /api/blogs/:id
// @access  Private/Admin
export const updateBlog = async (req, res) => {
  try {
    const blog = await BlogPost.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // If any of the main fields are being updated, validate all
    if (
      req.body.title !== undefined ||
      req.body.excerpt !== undefined ||
      req.body.content !== undefined ||
      req.body.image !== undefined ||
      req.body.author !== undefined ||
      req.body.readTime !== undefined
    ) {
      const validation = validateBlogPost({
        ...blog.toObject(),
        ...req.body,
      });
      if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
      }
    }

    const { title, excerpt, content, image, category, author, isPublished, tags, readTime } = req.body;

    if (title !== undefined) blog.title = toTrimmedString(title);
    if (excerpt !== undefined) blog.excerpt = toTrimmedString(excerpt);
    if (content !== undefined) blog.content = toTrimmedString(content);
    if (image !== undefined) blog.image = toTrimmedString(image);
    if (author !== undefined) blog.author = toTrimmedString(author) || blog.author;
    if (readTime !== undefined) blog.readTime = toTrimmedString(readTime);
    if (isPublished !== undefined) blog.isPublished = Boolean(isPublished);
    if (tags !== undefined) {
      blog.tags = Array.isArray(tags) ? tags.map((tag) => toTrimmedString(tag)).filter(Boolean) : [];
    }
    if (category !== undefined) {
      const categoryDoc = await BlogCategory.findById(category);
      if (!categoryDoc) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      blog.category = category;
    }

    const updated = await blog.save();
    const populated = await BlogPost.findById(updated._id).populate('category', 'name');
    emitEntitySync('blog', 'updated', populated);
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete blog post
// @route   DELETE /api/blogs/:id
// @access  Private/Admin
export const deleteBlog = async (req, res) => {
  try {
    const blog = await BlogPost.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    await blog.deleteOne();
    emitEntitySync('blog', 'deleted', { _id: req.params.id });
    res.json({ message: 'Blog removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
