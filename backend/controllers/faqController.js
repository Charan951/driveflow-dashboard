import FaqCategory from '../models/FaqCategory.js';
import FaqItem from '../models/FaqItem.js';

const defaultFaqs = [
  {
    category: "Booking & Services",
    questions: [
      {
        q: "How do I make a booking?",
        a: "Booking a service is easy! Simply log in to your account, click on 'Book Service', choose your vehicle type, select the desired service package, pick a convenient date and time, and confirm your booking."
      },
      {
        q: "What are your workshop timings?",
        a: "Our workshops are open from 8:00 AM to 8:00 PM, Monday through Saturday. On Sundays, we operate from 9:00 AM to 5:00 PM for limited services."
      },
      {
        q: "Do you offer pick-up and drop-off?",
        a: "Yes, we offer complimentary pick-up and drop-off services for all major service packages within a 10km radius of our service centers."
      },
      {
        q: "How long does a general service take?",
        a: "A standard periodic maintenance service usually takes 4-6 hours. However, this may vary depending on the vehicle condition and any additional repairs required."
      }
    ]
  },
  {
    category: "Payments & Pricing",
    questions: [
      {
        q: "Do you accept credit cards?",
        a: "Yes, we accept all major credit cards, debit cards, UPI, and net banking. You can pay online through our secure portal or at the time of delivery."
      },
      {
        q: "Is there any hidden cost?",
        a: "No, we believe in complete transparency. All costs are estimated upfront. If any additional parts or repairs are needed during the service, we will seek your approval before proceeding."
      },
      {
        q: "Do you provide GST bills?",
        a: "Absolutely. All our invoices are GST compliant and detailed with part numbers and labor charges."
      }
    ]
  },
  {
    category: "Warranty & Parts",
    questions: [
      {
        q: "Do you use genuine parts?",
        a: "Yes, we use 100% genuine OES (Original Equipment Spares) or OEM (Original Equipment Manufacturer) parts recommended for your specific vehicle brand and model."
      },
      {
        q: "Is there a warranty on the service?",
        a: "We offer a 1000km or 1-month warranty (whichever comes first) on all our service workmanship and parts replaced."
      }
    ]
  }
];

// Helper to seed default FAQs if DB is empty
const seedDefaultFaqsIfNeeded = async () => {
  const categoryCount = await FaqCategory.countDocuments();
  if (categoryCount === 0) {
    for (let catIdx = 0; catIdx < defaultFaqs.length; catIdx++) {
      const catData = defaultFaqs[catIdx];
      const createdCategory = await FaqCategory.create({
        title: catData.category,
        order: catIdx,
        isActive: true,
      });

      for (let qIdx = 0; qIdx < catData.questions.length; qIdx++) {
        const item = catData.questions[qIdx];
        await FaqItem.create({
          category: createdCategory._id,
          question: item.q,
          answer: item.a,
          order: qIdx,
          isActive: true,
        });
      }
    }
  }
};

// @desc    Get all active FAQs for public view
// @route   GET /api/faqs
// @access  Public
export const getPublicFaqs = async (req, res) => {
  try {
    await seedDefaultFaqsIfNeeded();

    const categories = await FaqCategory.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    const categoryIds = categories.map(c => c._id);

    const items = await FaqItem.find({ category: { $in: categoryIds }, isActive: true }).sort({ order: 1, createdAt: 1 });

    const groupedFaqs = categories.map(cat => ({
      _id: cat._id,
      category: cat.title,
      order: cat.order,
      questions: items
        .filter(item => item.category.toString() === cat._id.toString())
        .map(item => ({
          _id: item._id,
          q: item.question,
          a: item.answer,
          order: item.order,
        })),
    })).filter(cat => cat.questions.length > 0);

    res.json(groupedFaqs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all FAQs (active + inactive) for admin management
// @route   GET /api/faqs/admin
// @access  Private/Admin
export const getAdminFaqs = async (req, res) => {
  try {
    await seedDefaultFaqsIfNeeded();

    const categories = await FaqCategory.find().sort({ order: 1, createdAt: 1 });
    const items = await FaqItem.find().sort({ order: 1, createdAt: 1 }).populate('category', 'title');

    const result = categories.map(cat => ({
      _id: cat._id,
      title: cat.title,
      order: cat.order,
      isActive: cat.isActive,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      questions: items
        .filter(item => item.category && item.category._id.toString() === cat._id.toString())
        .map(item => ({
          _id: item._id,
          question: item.question,
          answer: item.answer,
          order: item.order,
          isActive: item.isActive,
          categoryId: cat._id,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Category / Heading CRUD ---

// @desc    Create a new FAQ Category (Heading)
// @route   POST /api/faqs/categories
// @access  Private/Admin
export const createCategory = async (req, res) => {
  try {
    const { title, order, isActive } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Category title is required' });
    }

    const maxOrderCat = await FaqCategory.findOne().sort({ order: -1 });
    const nextOrder = order !== undefined ? Number(order) : (maxOrderCat ? maxOrderCat.order + 1 : 0);

    const category = await FaqCategory.create({
      title: title.trim(),
      order: nextOrder,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update an FAQ Category (Heading)
// @route   PUT /api/faqs/categories/:id
// @access  Private/Admin
export const updateCategory = async (req, res) => {
  try {
    const { title, order, isActive } = req.body;
    const category = await FaqCategory.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (title !== undefined) category.title = title.trim();
    if (order !== undefined) category.order = Number(order);
    if (isActive !== undefined) category.isActive = isActive;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an FAQ Category (Heading) and its questions
// @route   DELETE /api/faqs/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req, res) => {
  try {
    const category = await FaqCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Remove all child FAQ items under this category
    await FaqItem.deleteMany({ category: req.params.id });
    await category.deleteOne();

    res.json({ message: 'Category and associated FAQ items deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Question & Answer CRUD ---

// @desc    Create a new FAQ Question & Answer Item
// @route   POST /api/faqs/items
// @access  Private/Admin
export const createFaqItem = async (req, res) => {
  try {
    const { categoryId, question, answer, order, isActive } = req.body;

    if (!categoryId || !question || !answer) {
      return res.status(400).json({ message: 'Category, Question, and Answer are required' });
    }

    const categoryExists = await FaqCategory.findById(categoryId);
    if (!categoryExists) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const maxOrderItem = await FaqItem.findOne({ category: categoryId }).sort({ order: -1 });
    const nextOrder = order !== undefined ? Number(order) : (maxOrderItem ? maxOrderItem.order + 1 : 0);

    const faqItem = await FaqItem.create({
      category: categoryId,
      question: question.trim(),
      answer: answer.trim(),
      order: nextOrder,
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json(faqItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update an FAQ Question & Answer Item
// @route   PUT /api/faqs/items/:id
// @access  Private/Admin
export const updateFaqItem = async (req, res) => {
  try {
    const { categoryId, question, answer, order, isActive } = req.body;
    const faqItem = await FaqItem.findById(req.params.id);

    if (!faqItem) {
      return res.status(404).json({ message: 'FAQ Item not found' });
    }

    if (categoryId !== undefined) {
      const categoryExists = await FaqCategory.findById(categoryId);
      if (!categoryExists) {
        return res.status(404).json({ message: 'Category not found' });
      }
      faqItem.category = categoryId;
    }

    if (question !== undefined) faqItem.question = question.trim();
    if (answer !== undefined) faqItem.answer = answer.trim();
    if (order !== undefined) faqItem.order = Number(order);
    if (isActive !== undefined) faqItem.isActive = isActive;

    const updatedItem = await faqItem.save();
    res.json(updatedItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an FAQ Question & Answer Item
// @route   DELETE /api/faqs/items/:id
// @access  Private/Admin
export const deleteFaqItem = async (req, res) => {
  try {
    const faqItem = await FaqItem.findById(req.params.id);
    if (!faqItem) {
      return res.status(404).json({ message: 'FAQ Item not found' });
    }

    await faqItem.deleteOne();
    res.json({ message: 'FAQ Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
