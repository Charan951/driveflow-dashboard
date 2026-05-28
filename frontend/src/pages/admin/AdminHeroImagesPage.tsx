import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Trash2, 
  Plus, 
  Save, 
  RefreshCw, 
  FileText,
  Eye,
  Pencil,
  Briefcase,
  Image as ImageIcon,
  Layout,
  Type,
  AlignLeft,
  GripVertical,
  ChevronDown,
  ChevronUp,
  X,
  Loader2
} from 'lucide-react';
import { heroService, HeroSlide, PageHero } from '@/services/heroService';
import { uploadService } from '@/services/uploadService';
import { socketService } from '@/services/socket';
import GlobalSyncRefresh from '@/components/GlobalSyncRefresh';
import { blogService, BlogPost, BlogCategory } from '@/services/blogService';
import { careerService, Career } from '@/services/careerService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const PAGES = [
  { id: 'about', label: 'About Us' },
  { id: 'careers', label: 'Careers' },
  { id: 'faqs', label: 'FAQs' },
  { id: 'services', label: 'Services' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'blog', label: 'Blog' },
  { id: 'contact', label: 'Contact' }
];

const AdminHeroImagesPage = () => {
  const navigate = useNavigate();
  const [homeSlides, setHomeSlides] = useState<HeroSlide[]>([]);
  const [pageHeroes, setPageHeroes] = useState<Record<string, PageHero>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<{ type: 'home' | 'page' | 'blog', id?: string | number }>({ type: 'home' });
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);
  const [careers, setCareers] = useState<Career[]>([]);
  const [activeManagerTab, setActiveManagerTab] = useState<'blog' | 'careers'>('blog');
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [previewBlog, setPreviewBlog] = useState<BlogPost | null>(null);
  const [blogForm, setBlogForm] = useState({
    _id: '',
    title: '',
    excerpt: '',
    content: '',
    image: '',
    author: '',
    category: '',
    readTime: '',
    tags: '',
    isPublished: true,
  });
  const [contactDetails, setContactDetails] = useState({
    address: '',
    mobileNumber: '',
    email: '',
  });
  const [careerForm, setCareerForm] = useState({
    _id: '',
    title: '',
    department: '',
    location: '',
    type: '',
    salary: '',
    shortDescription: '',
    applyUrl: '',
    isActive: true,
  });

  useEffect(() => {
    fetchAllData();

    // Socket Setup
    socketService.connect();
    socketService.joinRoom('admin');

    return () => {
      socketService.leaveRoom('admin');
    };
  }, []);

  const fetchAllData = async () => {
    try {
      const [data, categoriesData, blogsData, careersData] = await Promise.all([
        heroService.getHeroSettings(),
        blogService.getAdminCategories(),
        blogService.getAdminBlogs(),
        careerService.getAdminCareers(),
      ]);
      
      // Home slides
      if (data.homeSlides && Array.isArray(data.homeSlides)) {
        // Migrate or ensure fields exist
        const processedSlides = data.homeSlides.map(s => {
          if (s.title && !s.titleWhite && !s.titleBlue) {
            const parts = s.title.split(' ');
            const titleBlue = parts.pop() || '';
            const titleWhite = parts.join(' ');
            return { ...s, titleWhite, titleBlue };
          }
          return {
            ...s,
            titleWhite: s.titleWhite || '',
            titleBlue: s.titleBlue || ''
          };
        });
        setHomeSlides(processedSlides);
      }

      // Page heroes
      if (data.pageHeroes) {
        setPageHeroes(data.pageHeroes);
      }
      if (data.contactDetails) {
        setContactDetails({
          address: data.contactDetails.address || '',
          mobileNumber: data.contactDetails.mobileNumber || '',
          email: data.contactDetails.email || '',
        });
      }

      setBlogCategories(categoriesData);
      setBlogs(blogsData);
      setCareers(careersData);
    } catch (error) {
      toast.error('Failed to load website content');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSlide = () => {
    const newSlide: HeroSlide = {
      id: Date.now(),
      image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1920',
      titleWhite: 'New Hero',
      titleBlue: 'Slide',
      subtitle: 'Experience premium vehicle services at your doorstep.'
    };
    setHomeSlides([...homeSlides, newSlide]);
  };

  const handleRemoveSlide = (id: string | number) => {
    setHomeSlides(homeSlides.filter(s => s.id !== id));
  };

  const handleUpdateSlide = (id: string | number, field: keyof HeroSlide, value: string) => {
    setHomeSlides(homeSlides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleUpdatePageHero = (pageId: string, field: keyof PageHero, value: string) => {
    setPageHeroes({
      ...pageHeroes,
      [pageId]: {
        ...(pageHeroes[pageId] || { page: pageId, image: '', title: '', subtitle: '' }),
        [field]: value
      }
    });
  };

  const triggerUpload = (type: 'home' | 'page' | 'blog', id?: string | number) => {
    setActiveUploadTarget({ type, id });
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(activeUploadTarget.type === 'home' ? activeUploadTarget.id?.toString() || 'new' : activeUploadTarget.id?.toString() || 'page');
    try {
      const res = await uploadService.uploadFile(file);
      if (activeUploadTarget.type === 'home' && activeUploadTarget.id !== undefined) {
        handleUpdateSlide(activeUploadTarget.id, 'image', res.url);
      } else if (activeUploadTarget.type === 'page' && activeUploadTarget.id !== undefined) {
        handleUpdatePageHero(activeUploadTarget.id.toString(), 'image', res.url);
      } else if (activeUploadTarget.type === 'blog') {
        setBlogForm((prev) => ({ ...prev, image: res.url }));
      }
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(null);
      // Reset file input value to allow uploading the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await heroService.updateHeroSettings({
        homeSlides,
        pageHeroes,
        contactDetails,
      });
      toast.success('Hero settings saved to S3 successfully');
    } catch (error) {
      toast.error('Failed to save hero settings to S3');
    } finally {
      setSaving(false);
    }
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newSlides = [...homeSlides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSlides.length) {
      [newSlides[index], newSlides[targetIndex]] = [newSlides[targetIndex], newSlides[index]];
      setHomeSlides(newSlides);
    }
  };

  const resetBlogForm = () => {
    setBlogForm({
      _id: '',
      title: '',
      excerpt: '',
      content: '',
      image: '',
      author: '',
      category: blogCategories[0]?._id || '',
      readTime: '',
      tags: '',
      isPublished: true,
    });
  };

  const editBlog = (blog: BlogPost) => {
    setBlogForm({
      _id: blog._id,
      title: blog.title || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      image: blog.image || '',
      author: blog.author || '',
      category: typeof blog.category === 'string' ? blog.category : blog.category?._id || '',
      readTime: blog.readTime || '',
      tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : '',
      isPublished: !!blog.isPublished,
    });
  };

  const handleSaveBlog = async () => {
    if (!blogForm.title || !blogForm.excerpt || !blogForm.content || !blogForm.category) {
      toast.error('Title, excerpt, content and category are required');
      return;
    }

    try {
      const payload = {
        title: blogForm.title,
        excerpt: blogForm.excerpt,
        content: blogForm.content,
        image: blogForm.image,
        author: blogForm.author,
        category: blogForm.category,
        readTime: blogForm.readTime,
        isPublished: blogForm.isPublished,
        tags: blogForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      if (blogForm._id) {
        await blogService.updateBlog(blogForm._id, payload);
        toast.success('Blog updated');
      } else {
        await blogService.createBlog(payload);
        toast.success('Blog created');
      }

      resetBlogForm();
      fetchAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save blog');
    }
  };

  const handleDeleteBlog = async (id: string) => {
    try {
      await blogService.deleteBlog(id);
      toast.success('Blog deleted');
      if (blogForm._id === id) {
        resetBlogForm();
      }
      fetchAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete blog');
    }
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      await blogService.createCategory(categoryForm);
      toast.success('Category created');
      setCategoryForm({ name: '', description: '' });
      fetchAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create category');
    }
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCategoryId) return;
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    try {
      await blogService.updateCategory(editingCategoryId, {
        name: categoryForm.name,
        description: categoryForm.description,
      });
      toast.success('Category updated');
      setEditingCategoryId(null);
      setCategoryForm({ name: '', description: '' });
      fetchAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update category');
    }
  };

  const handleEditCategory = (category: BlogCategory) => {
    setEditingCategoryId(category._id);
    setCategoryForm({
      name: category.name || '',
      description: category.description || '',
    });
  };

  const openBlogPreview = (blog: BlogPost) => {
    setPreviewBlog(blog);
  };

  const resetCareerForm = () => {
    setCareerForm({
      _id: '',
      title: '',
      department: '',
      location: '',
      type: '',
      salary: '',
      shortDescription: '',
      applyUrl: '',
      isActive: true,
    });
  };

  const editCareer = (career: Career) => {
    setCareerForm({
      _id: career._id,
      title: career.title || '',
      department: career.department || '',
      location: career.location || '',
      type: career.type || '',
      salary: career.salary || '',
      shortDescription: career.shortDescription || '',
      applyUrl: career.applyUrl || '',
      isActive: career.isActive,
    });
    setActiveManagerTab('careers');
  };

  const handleSaveCareer = async () => {
    if (!careerForm.title || !careerForm.department || !careerForm.location || !careerForm.type) {
      toast.error('Title, department, location and type are required');
      return;
    }
    try {
      const payload = {
        title: careerForm.title,
        department: careerForm.department,
        location: careerForm.location,
        type: careerForm.type,
        salary: careerForm.salary,
        shortDescription: careerForm.shortDescription,
        applyUrl: careerForm.applyUrl,
        isActive: careerForm.isActive,
      };
      if (careerForm._id) {
        await careerService.updateCareer(careerForm._id, payload);
        toast.success('Career updated');
      } else {
        await careerService.createCareer(payload);
        toast.success('Career created');
      }
      resetCareerForm();
      fetchAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save career');
    }
  };

  const handleDeleteCareer = async (id: string) => {
    try {
      await careerService.deleteCareer(id);
      toast.success('Career deleted');
      if (careerForm._id === id) {
        resetCareerForm();
      }
      fetchAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete career');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await blogService.deleteCategory(id);
      toast.success('Category deleted');
      if (blogForm.category === id) {
        setBlogForm((prev) => ({ ...prev, category: '' }));
      }
      fetchAllData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete category');
    }
  };

  useEffect(() => {
    if (!blogForm._id && !blogForm.category && blogCategories.length > 0) {
      setBlogForm((prev) => ({ ...prev, category: blogCategories[0]._id }));
    }
  }, [blogCategories, blogForm._id, blogForm.category]);

  return (
    <GlobalSyncRefresh entities={['hero', 'blog', 'blogcategory', 'career']} onSync={fetchAllData}>
    {loading ? (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
    ) : (
    <div className="max-w-6xl mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit website</h1>
          <p className="text-muted-foreground mt-1">Manage slides and hero banners across your application</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-70"
        >
          {saving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      <div className="space-y-12">
        {/* Home Page Carousel */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Layout className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-xl font-bold">Home Page Carousel</h2>
            </div>
            <button
              onClick={handleAddSlide}
              className="text-primary hover:bg-primary/10 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Slide
            </button>
          </div>

          <div className="grid gap-6">
            <AnimatePresence mode="popLayout">
              {homeSlides.map((slide, index) => (
                <motion.div
                  key={slide.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row">
                    {/* Image Preview */}
                    <div className="lg:w-1/3 relative group">
                      <img 
                        src={slide.image} 
                        alt={slide.title} 
                        className="w-full h-48 lg:h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => triggerUpload('home', slide.id)}
                          className="bg-white/20 backdrop-blur-md text-white p-3 rounded-full hover:bg-white/30 transition-all"
                        >
                          {uploading === slide.id.toString() ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                        </button>
                      </div>
                    </div>

                    {/* Content Editor */}
                    <div className="flex-1 p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Title (White Text)</label>
                              <div className="relative">
                                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input 
                                  type="text"
                                  value={slide.titleWhite}
                                  onChange={(e) => handleUpdateSlide(slide.id, 'titleWhite', e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                                  placeholder="White text..."
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Title (Blue Text)</label>
                              <div className="relative">
                                <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                                <input 
                                  type="text"
                                  value={slide.titleBlue}
                                  onChange={(e) => handleUpdateSlide(slide.id, 'titleBlue', e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all text-blue-600"
                                  placeholder="Blue text..."
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Subtitle / Description</label>
                            <div className="relative">
                              <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                              <textarea 
                                value={slide.subtitle}
                                onChange={(e) => handleUpdateSlide(slide.id, 'subtitle', e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[80px] resize-none"
                                placeholder="Enter description..."
                              />
                            </div>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col gap-2 ml-4">
                          <button 
                            onClick={() => moveSlide(index, 'up')}
                            disabled={index === 0}
                            className="p-2 hover:bg-muted rounded-lg text-muted-foreground disabled:opacity-30"
                          >
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => moveSlide(index, 'down')}
                            disabled={index === homeSlides.length - 1}
                            className="p-2 hover:bg-muted rounded-lg text-muted-foreground disabled:opacity-30"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleRemoveSlide(slide.id)}
                            className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {homeSlides.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground">No slides added yet. Click 'Add Slide' to start.</p>
              </div>
            )}
          </div>
        </section>

        {/* Page Hero Banners */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <ImageIcon className="w-6 h-6 text-purple-500" />
            </div>
            <h2 className="text-xl font-bold">Page Hero Banners</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {PAGES.map((page) => {
              const hero = pageHeroes[page.id] || { page: page.id, image: '', title: '', subtitle: '' };
              return (
                <div key={page.id} className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">{page.label} Page</h3>
                    <div className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground font-mono uppercase">
                      /{page.id}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group rounded-xl overflow-hidden aspect-video bg-muted">
                      {hero.image ? (
                        <img 
                          src={hero.image} 
                          alt={page.label} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground opacity-20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button 
                          onClick={() => triggerUpload('page', page.id)}
                          className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all flex items-center gap-2"
                        >
                          {uploading === page.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          Change Banner
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Title Override</label>
                        <input 
                          type="text"
                          value={hero.title}
                          onChange={(e) => handleUpdatePageHero(page.id, 'title', e.target.value)}
                          className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                          placeholder="Default Page Title"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Subtitle / Description</label>
                        <textarea 
                          value={hero.subtitle}
                          onChange={(e) => handleUpdatePageHero(page.id, 'subtitle', e.target.value)}
                          className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[60px] resize-none"
                          placeholder="Enter banner description..."
                        />
                      </div>
                      {page.id === 'contact' && (
                        <>
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Address</label>
                            <textarea
                              value={contactDetails.address}
                              onChange={(e) => setContactDetails((prev) => ({ ...prev, address: e.target.value }))}
                              className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[70px] resize-none"
                              placeholder="Enter address"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Mobile Number</label>
                            <input
                              type="text"
                              value={contactDetails.mobileNumber}
                              onChange={(e) => setContactDetails((prev) => ({ ...prev, mobileNumber: e.target.value }))}
                              className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                              placeholder="+91 9876543210"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Email</label>
                            <input
                              type="email"
                              value={contactDetails.email}
                              onChange={(e) => setContactDetails((prev) => ({ ...prev, email: e.target.value }))}
                              className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                              placeholder="support@carzzi.com"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Content Manager tabs - kept at bottom intentionally */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold">Content Manager</h2>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setActiveManagerTab('blog')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeManagerTab === 'blog' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              Blog Content
            </button>
            <button
              onClick={() => setActiveManagerTab('careers')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeManagerTab === 'careers' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              Careers
            </button>
          </div>

          {activeManagerTab === 'blog' ? (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-bold text-lg">Categories</h3>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Category name"
                  className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                />
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[80px] resize-none"
                />
                <button
                  onClick={editingCategoryId ? handleSaveCategoryEdit : handleCreateCategory}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  {editingCategoryId ? 'Save Category' : 'Add Category'}
                </button>

                <div className="space-y-2 pt-2 max-h-64 overflow-y-auto pr-1">
                  {blogCategories.map((category) => (
                    <div key={category._id} className="flex items-center justify-between bg-muted/40 hover:bg-muted/60 rounded-lg px-3 py-2 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{category.name}</p>
                        {category.description ? (
                          <p className="text-[11px] text-muted-foreground truncate">{category.description}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="p-1.5 rounded-md hover:bg-background text-primary"
                          title="Edit category"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category._id)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                          title="Delete category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">{blogForm._id ? 'Edit Blog' : 'Create Blog'}</h3>
                  <button onClick={resetBlogForm} className="text-sm text-primary hover:underline">New Blog</button>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <input type="text" value={blogForm.title} onChange={(e) => setBlogForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Blog title" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                  <input type="text" value={blogForm.author} onChange={(e) => setBlogForm((prev) => ({ ...prev, author: e.target.value }))} placeholder="Author" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                  <select value={blogForm.category} onChange={(e) => setBlogForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all">
                    <option value="">Select category</option>
                    {blogCategories.map((category) => (<option key={category._id} value={category._id}>{category.name}</option>))}
                  </select>
                  <input type="text" value={blogForm.readTime} onChange={(e) => setBlogForm((prev) => ({ ...prev, readTime: e.target.value }))} placeholder="Read time (e.g. 5 min read)" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                </div>

                <textarea value={blogForm.excerpt} onChange={(e) => setBlogForm((prev) => ({ ...prev, excerpt: e.target.value }))} placeholder="Short excerpt" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[70px] resize-none" />
                <textarea value={blogForm.content} onChange={(e) => setBlogForm((prev) => ({ ...prev, content: e.target.value }))} placeholder="Blog content" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[150px] resize-y" />
                <input type="text" value={blogForm.tags} onChange={(e) => setBlogForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="Tags (comma-separated)" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />

                <div className="flex flex-wrap items-center gap-3">
                  <input type="text" value={blogForm.image} onChange={(e) => setBlogForm((prev) => ({ ...prev, image: e.target.value }))} placeholder="Image URL" className="flex-1 min-w-[220px] px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                  <button onClick={() => triggerUpload('blog')} className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors">Upload Image</button>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={blogForm.isPublished} onChange={(e) => setBlogForm((prev) => ({ ...prev, isPublished: e.target.checked }))} />
                    Published
                  </label>
                  <button onClick={handleSaveBlog} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                    {blogForm._id ? 'Update Blog' : 'Create Blog'}
                  </button>
                </div>

                <div className="space-y-2 pt-3 border-t border-border max-h-72 overflow-y-auto pr-1">
                  {blogs.map((blog) => (
                    <div key={blog._id} className="flex items-center justify-between gap-3 bg-muted/40 hover:bg-muted/60 rounded-lg px-3 py-2 transition-colors">
                      <div className="min-w-0 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${blog.isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} title={blog.isPublished ? 'Published' : 'Draft'} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{blog.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{typeof blog.category === 'string' ? '' : blog.category?.name} • {blog.isPublished ? 'Published' : 'Draft'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openBlogPreview(blog)} className="p-1.5 rounded-md hover:bg-background text-muted-foreground hover:text-foreground" title="Preview blog"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => editBlog(blog)} className="p-1.5 rounded-md hover:bg-background text-primary" title="Edit blog"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteBlog(blog._id)} className="p-1.5 rounded-md hover:bg-red-50 text-red-600" title="Delete blog"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg">{careerForm._id ? 'Edit Career' : 'Create Career'}</h3>
                  <button onClick={resetCareerForm} className="text-sm text-primary hover:underline">New Career</button>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <input type="text" value={careerForm.title} onChange={(e) => setCareerForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Job title" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                  <input type="text" value={careerForm.department} onChange={(e) => setCareerForm((prev) => ({ ...prev, department: e.target.value }))} placeholder="Department" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                  <input type="text" value={careerForm.location} onChange={(e) => setCareerForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Location" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                  <input type="text" value={careerForm.type} onChange={(e) => setCareerForm((prev) => ({ ...prev, type: e.target.value }))} placeholder="Type (e.g. Full-time)" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                  <input type="text" value={careerForm.salary} onChange={(e) => setCareerForm((prev) => ({ ...prev, salary: e.target.value }))} placeholder="Salary (e.g. ₹8L - ₹12L)" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                  <input type="text" value={careerForm.applyUrl} onChange={(e) => setCareerForm((prev) => ({ ...prev, applyUrl: e.target.value }))} placeholder="Apply URL (optional)" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                </div>

                <textarea value={careerForm.shortDescription} onChange={(e) => setCareerForm((prev) => ({ ...prev, shortDescription: e.target.value }))} placeholder="Short description" className="w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[80px] resize-none" />

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={careerForm.isActive} onChange={(e) => setCareerForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
                    Active
                  </label>
                  <button onClick={handleSaveCareer} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                    {careerForm._id ? 'Update Career' : 'Create Career'}
                  </button>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-3">
                <h3 className="font-bold text-lg">Posted Careers</h3>
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {careers.map((career) => (
                    <div key={career._id} className="flex items-center justify-between gap-2 bg-muted/40 hover:bg-muted/60 rounded-lg px-3 py-2 transition-colors">
                      <button
                        onClick={() => navigate(`/admin/careers/${career._id}`)}
                        className="min-w-0 text-left flex-1"
                        title="Open job details and applications"
                      >
                        <p className="font-medium text-sm truncate">{career.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{career.department} • {career.isActive ? 'Active' : 'Inactive'}</p>
                      </button>
                      <div className="flex items-center gap-1">
                        <button onClick={() => editCareer(career)} className="p-1.5 rounded-md hover:bg-background text-primary" title="Edit career"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteCareer(career._id)} className="p-1.5 rounded-md hover:bg-red-50 text-red-600" title="Delete career"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {previewBlog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">Blog Preview</h3>
              <button
                onClick={() => setPreviewBlog(null)}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground"
                title="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {previewBlog.image ? (
                <img
                  src={previewBlog.image}
                  alt={previewBlog.title}
                  className="w-full h-56 object-cover rounded-xl border border-border"
                />
              ) : null}

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded-full bg-muted border border-border">
                  {typeof previewBlog.category === 'string' ? previewBlog.category : previewBlog.category?.name}
                </span>
                <span>{previewBlog.isPublished ? 'Published' : 'Draft'}</span>
                <span>•</span>
                <span>{previewBlog.readTime || '5 min read'}</span>
                <span>•</span>
                <span>{previewBlog.author}</span>
              </div>

              <h4 className="text-2xl font-bold leading-tight">{previewBlog.title}</h4>
              <p className="text-muted-foreground">{previewBlog.excerpt}</p>
              <div className="whitespace-pre-wrap leading-7 text-sm">{previewBlog.content}</div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
    )}
    </GlobalSyncRefresh>
  );
};

export default AdminHeroImagesPage;
