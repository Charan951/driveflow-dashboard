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
  Loader2,
  ExternalLink,
  Users,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { heroService, HeroSlide, PageHero } from '@/services/heroService';
import { uploadService } from '@/services/uploadService';
import { socketService } from '@/services/socket';
import GlobalSyncRefresh from '@/components/GlobalSyncRefresh';
import { blogService, BlogPost, BlogCategory } from '@/services/blogService';
import { careerService, Career, CareerApplication } from '@/services/careerService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  isValidEmail,
  isEmailTooLong,
  isValidPhone10,
  isValidHeroTitle,
  isHeroTitleTooLong,
  isValidHeroSubtitle,
  isHeroSubtitleTooLong,
  isSlideTitleTooLong,
  isValidSlideTitle,
  isSlideSubtitleTooLong,
  isValidAddress,
  isAddressTooLong,
  isValidBlogTitle,
  isBlogTitleTooLong,
  isValidBlogExcerpt,
  isBlogExcerptTooLong,
  isValidBlogContent,
  isBlogContentTooLong,
  isValidBlogAuthor,
  isBlogAuthorTooLong,
  isValidBlogTags,
  isBlogTagsTooLong,
  isValidBlogReadTime,
  isBlogReadTimeTooLong,
  isValidImageUrl,
  isImageUrlTooLong,
  isValidCategoryName,
  isCategoryNameTooLong,
  isValidCategoryDescription,
  isCategoryDescriptionTooLong,
  hasExcessiveRepeatedChars,
  isOnlySpecialCharacters,
  isOnlyNumbers,
  validateCareerField,
  type CareerFormField,
  MAX_CAREER_TITLE_LENGTH,
  MAX_CAREER_DEPARTMENT_LENGTH,
  MAX_CAREER_LOCATION_LENGTH,
  MAX_CAREER_TYPE_LENGTH,
  MAX_CAREER_SALARY_LENGTH,
  MAX_CAREER_SHORT_DESCRIPTION_LENGTH,
  MAX_CAREER_APPLY_URL_LENGTH,
} from '@/lib/formValidation';

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
  const [showGetStarted, setShowGetStarted] = useState<boolean>(true);
  const [showLearnMore, setShowLearnMore] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [savingHomeSlides, setSavingHomeSlides] = useState(false);
  const [savingPageHeroes, setSavingPageHeroes] = useState(false);
  const [savingPageId, setSavingPageId] = useState<string | null>(null);
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
  const [selectedCareerForApps, setSelectedCareerForApps] = useState<string | null>(null);
  const [careerApplications, setCareerApplications] = useState<CareerApplication[]>([]);
  const [loadingCareerApplications, setLoadingCareerApplications] = useState(false);
  const [careerFormErrors, setCareerFormErrors] = useState<Partial<Record<CareerFormField, string>>>({});
  const careerFormFields: CareerFormField[] = [
    'title',
    'department',
    'location',
    'type',
    'salary',
    'shortDescription',
    'applyUrl',
  ];
  // Track validation errors for slides
  const [slideErrors, setSlideErrors] = useState<Record<string | number, { titleWhite?: string; titleBlue?: string; subtitle?: string }>>({});
  const [pageHeroErrors, setPageHeroErrors] = useState<Record<string, { title?: string; subtitle?: string }>>({});

  const validatePageHeroField = (
    field: 'title' | 'subtitle',
    value: string,
  ): string | null => {
    const trimmed = value.trim();

    if (field === 'title') {
      if (!trimmed) return 'Title is required';
      if (isHeroTitleTooLong(value)) return 'Title is too long (max 100 characters)';
      if (isOnlySpecialCharacters(trimmed)) {
        return 'Title cannot contain only special characters';
      }
      if (isOnlyNumbers(trimmed)) {
        return 'Title cannot contain only numbers';
      }
      if (hasExcessiveRepeatedChars(value)) return 'Too many repeated characters';
      return null;
    }

    if (!trimmed) return 'Subtitle is required';
    if (isHeroSubtitleTooLong(value)) return 'Subtitle is too long (max 300 characters)';
    if (isOnlySpecialCharacters(trimmed)) {
      return 'Subtitle cannot contain only special characters';
    }
    if (isOnlyNumbers(trimmed)) {
      return 'Subtitle cannot contain only numbers';
    }
    if (hasExcessiveRepeatedChars(value)) return 'Too many repeated characters';
    return null;
  };

  const validatePageHero = (hero: PageHero): { title?: string; subtitle?: string } => {
    const errors: { title?: string; subtitle?: string } = {};
    const titleError = validatePageHeroField('title', hero.title || '');
    if (titleError) errors.title = titleError;
    const subtitleError = validatePageHeroField('subtitle', hero.subtitle || '');
    if (subtitleError) errors.subtitle = subtitleError;
    return errors;
  };

  const applyPageHeroValidationErrors = (pageId: string, hero: PageHero) => {
    const errors = validatePageHero(hero);
    setPageHeroErrors((prev) => ({
      ...prev,
      [pageId]: errors,
    }));
    return Object.keys(errors).length === 0;
  };

  // Validate a single slide field and return error message
  const validateSlideField = (slideId: string | number, field: keyof HeroSlide, value: string): string | null => {
    const trimmed = value.trim();
    
    if (field === 'titleWhite' || field === 'titleBlue') {
      if (!trimmed) return 'This field is required';
      if (isSlideTitleTooLong(value)) return 'Title is too long (max 20 characters)';
      if (!isValidSlideTitle(value)) return 'Letters and numbers only. Special characters and purely digit entries are not allowed.';
    }
    
    if (field === 'subtitle') {
      if (!trimmed) return 'This field is required';
      if (isSlideSubtitleTooLong(value)) return 'Subtitle is too long (max 150 characters)';
      if (isOnlySpecialCharacters(trimmed)) {
        return 'Subtitle cannot contain only special characters';
      }
      if (isOnlyNumbers(trimmed)) {
        return 'Subtitle cannot contain only numbers';
      }
      if (hasExcessiveRepeatedChars(value)) return 'Too many repeated characters';
      if (!isValidHeroSubtitle(value)) return 'Invalid subtitle';
    }
    
    return null;
  };

  // Validate entire slide
  const validateSlide = (slide: HeroSlide): { titleWhite?: string; titleBlue?: string; subtitle?: string } => {
    const errors: { titleWhite?: string; titleBlue?: string; subtitle?: string } = {};
    
    const titleWhiteError = validateSlideField(slide.id, 'titleWhite', slide.titleWhite);
    if (titleWhiteError) errors.titleWhite = titleWhiteError;
    
    const titleBlueError = validateSlideField(slide.id, 'titleBlue', slide.titleBlue);
    if (titleBlueError) errors.titleBlue = titleBlueError;
    
    const subtitleError = validateSlideField(slide.id, 'subtitle', slide.subtitle);
    if (subtitleError) errors.subtitle = subtitleError;
    
    return errors;
  };

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
        
        // Initialize errors state for existing slides
        const initialErrors: Record<string | number, { titleWhite?: string; titleBlue?: string; subtitle?: string }> = {};
        processedSlides.forEach(slide => {
          initialErrors[slide.id] = {};
        });
        setSlideErrors(initialErrors);
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
      // Toggle settings
      if (data.showGetStarted !== undefined) {
        setShowGetStarted(data.showGetStarted);
      }
      if (data.showLearnMore !== undefined) {
        setShowLearnMore(data.showLearnMore);
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
      image: '',
      titleWhite: '',
      titleBlue: '',
      subtitle: ''
    };
    setHomeSlides([...homeSlides, newSlide]);
    // Initialize errors for new slide
    setSlideErrors(prev => ({
      ...prev,
      [newSlide.id]: {}
    }));
    toast.success('New slide added successfully');
  };

  const handleRemoveSlide = (id: string | number) => {
    setHomeSlides(homeSlides.filter(s => s.id !== id));
    // Remove errors for deleted slide
    setSlideErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
    toast.success('Slide removed successfully');
  };

  const handleUpdateSlide = (id: string | number, field: keyof HeroSlide, value: string) => {
    // Validate the field
    const error = validateSlideField(id, field, value);
    
    // Update errors state
    setSlideErrors(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: error
      }
    }));
    
    // Update the slide
    setHomeSlides(homeSlides.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleUpdatePageHero = (pageId: string, field: keyof PageHero, value: string) => {
    if (field === 'title' || field === 'subtitle') {
      const error = validatePageHeroField(field, value);
      setPageHeroErrors((prev) => ({
        ...prev,
        [pageId]: {
          ...prev[pageId],
          [field]: error || undefined,
        },
      }));
    }

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

  const handleSaveHomeSlides = async () => {
    console.log('handleSaveHomeSlides called');
    console.log('Current home slides:', homeSlides);
    
    // Validate all slides
    let hasErrors = false;
    const allErrors: Record<string | number, { titleWhite?: string; titleBlue?: string; subtitle?: string }> = {};
    
    for (let i = 0; i < homeSlides.length; i++) {
      const slide = homeSlides[i];
      const errors = validateSlide(slide);
      
      if (Object.keys(errors).length > 0) {
        hasErrors = true;
        allErrors[slide.id] = errors;
      }
    }
    
    // Update error state
    setSlideErrors(allErrors);
    
    if (hasErrors) {
      toast.error('Please fix the errors in the slides before saving');
      return;
    }

    setSavingHomeSlides(true);
    try {
      console.log('Sending home slides data:', {
        homeSlides,
        pageHeroes,
        contactDetails,
        showGetStarted,
        showLearnMore,
      });
      await heroService.updateHeroSettings({
        homeSlides,
        pageHeroes,
        contactDetails,
        showGetStarted,
        showLearnMore,
      });
      toast.success('Home slides saved successfully');
    } catch (error: any) {
      console.error('Error saving home slides:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to save home slides';
      toast.error(errorMessage);
    } finally {
      setSavingHomeSlides(false);
    }
  };

  const handleSavePageHeroes = async () => {
    let hasPageHeroErrors = false;
    const allPageHeroErrors: Record<string, { title?: string; subtitle?: string }> = {};

    for (const page of PAGES) {
      const pageHero = pageHeroes[page.id] || { page: page.id, image: '', title: '', subtitle: '' };
      const errors = validatePageHero(pageHero);
      if (Object.keys(errors).length > 0) {
        hasPageHeroErrors = true;
        allPageHeroErrors[page.id] = errors;
      }
      if (pageHero.image && !isValidImageUrl(pageHero.image)) {
        toast.error(`${page.label} hero image URL is invalid`);
        return;
      }
      if (isImageUrlTooLong(pageHero.image)) {
        toast.error(`${page.label} hero image URL is too long`);
        return;
      }
    }

    setPageHeroErrors(allPageHeroErrors);
    if (hasPageHeroErrors) {
      toast.error('Please fix the errors in page hero banners before saving');
      return;
    }
    if (!isValidAddress(contactDetails.address)) {
      toast.error('Address contains invalid characters');
      return;
    }
    if (isAddressTooLong(contactDetails.address)) {
      toast.error('Address is too long');
      return;
    }
    if (contactDetails.mobileNumber && !isValidPhone10(contactDetails.mobileNumber)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (contactDetails.email && !isValidEmail(contactDetails.email).valid) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (isEmailTooLong(contactDetails.email)) {
      toast.error('Email is too long');
      return;
    }

    setSavingPageHeroes(true);
    try {
      await heroService.updateHeroSettings({
        homeSlides,
        pageHeroes,
        contactDetails,
        showGetStarted,
        showLearnMore,
      });
      toast.success('Page heroes saved successfully');
    } catch (error: any) {
      console.error('Error saving page heroes:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to save page heroes';
      toast.error(errorMessage);
    } finally {
      setSavingPageHeroes(false);
    }
  };

  const handleSaveSinglePageHero = async (pageId: string) => {
    console.log('handleSaveSinglePageHero called with pageId:', pageId);
    const pageHero = pageHeroes[pageId] || { page: pageId, image: '', title: '', subtitle: '' };
    const pageLabel = PAGES.find(p => p.id === pageId)?.label || pageId;

    console.log('Current page hero data:', pageHero);

    if (!applyPageHeroValidationErrors(pageId, pageHero)) {
      toast.error(`Please fix the errors in ${pageLabel} hero banner before saving`);
      return;
    }
    if (pageHero.image && !isValidImageUrl(pageHero.image)) {
      toast.error(`${pageLabel} hero image URL is invalid`);
      return;
    }
    if (isImageUrlTooLong(pageHero.image)) {
      toast.error(`${pageLabel} hero image URL is too long`);
      return;
    }

    if (pageId === 'contact') {
      console.log('Validating contact details:', contactDetails);
      if (!isValidAddress(contactDetails.address)) {
        toast.error('Address contains invalid characters');
        return;
      }
      if (isAddressTooLong(contactDetails.address)) {
        toast.error('Address is too long');
        return;
      }
      if (contactDetails.mobileNumber && !isValidPhone10(contactDetails.mobileNumber)) {
        toast.error('Please enter a valid 10-digit mobile number');
        return;
      }
      if (contactDetails.email) {
        const emailValidation = isValidEmail(contactDetails.email);
        console.log('Email validation result:', emailValidation);
        if (!emailValidation.valid) {
          toast.error(emailValidation.error || 'Please enter a valid email address');
          return;
        }
      }
      if (isEmailTooLong(contactDetails.email)) {
        toast.error('Email is too long');
        return;
      }
    }

    setSavingPageId(pageId);
    try {
      console.log('Calling updateHeroSettings with data:', {
        homeSlides,
        pageHeroes,
        contactDetails,
        showGetStarted,
        showLearnMore,
      });
      await heroService.updateHeroSettings({
        homeSlides,
        pageHeroes,
        contactDetails,
        showGetStarted,
        showLearnMore,
      });
      toast.success(`${pageLabel} hero saved successfully`);
    } catch (error: any) {
      console.error('Error saving page hero:', error);
      const errorMessage = error?.response?.data?.message || `Failed to save ${pageLabel} hero`;
      toast.error(errorMessage);
    } finally {
      setSavingPageId(null);
    }
  };

  const handleSave = async () => {
    // Validate all home slides
    let hasErrors = false;
    const allErrors: Record<string | number, { titleWhite?: string; titleBlue?: string; subtitle?: string }> = {};
    
    for (let i = 0; i < homeSlides.length; i++) {
      const slide = homeSlides[i];
      const errors = validateSlide(slide);
      
      if (Object.keys(errors).length > 0) {
        hasErrors = true;
        allErrors[slide.id] = errors;
      }
    }
    
    // Update error state
    setSlideErrors(allErrors);
    
    if (hasErrors) {
      toast.error('Please fix the errors in the slides before saving');
      return;
    }

    // Validate page heroes
    let hasPageHeroErrors = false;
    const allPageHeroErrors: Record<string, { title?: string; subtitle?: string }> = {};

    for (const page of PAGES) {
      const pageHero = pageHeroes[page.id] || { page: page.id, image: '', title: '', subtitle: '' };
      const errors = validatePageHero(pageHero);
      if (Object.keys(errors).length > 0) {
        hasPageHeroErrors = true;
        allPageHeroErrors[page.id] = errors;
      }
      if (pageHero.image && !isValidImageUrl(pageHero.image)) {
        toast.error(`${page.label} hero image URL is invalid`);
        return;
      }
      if (isImageUrlTooLong(pageHero.image)) {
        toast.error(`${page.label} hero image URL is too long`);
        return;
      }
    }

    setPageHeroErrors(allPageHeroErrors);
    if (hasPageHeroErrors) {
      toast.error('Please fix the errors in page hero banners before saving');
      return;
    }
    // Validate contact details
    if (!isValidAddress(contactDetails.address)) {
      toast.error('Address contains invalid characters');
      return;
    }
    if (isAddressTooLong(contactDetails.address)) {
      toast.error('Address is too long');
      return;
    }
    if (contactDetails.mobileNumber && !isValidPhone10(contactDetails.mobileNumber)) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (contactDetails.email) {
      const emailValidation = isValidEmail(contactDetails.email);
      if (!emailValidation.valid) {
        toast.error(emailValidation.error || 'Please enter a valid email address');
        return;
      }
    }
    if (isEmailTooLong(contactDetails.email)) {
      toast.error('Email is too long');
      return;
    }

    setSavingAll(true);
    try {
      await heroService.updateHeroSettings({
        homeSlides,
        pageHeroes,
        contactDetails,
        showGetStarted,
        showLearnMore,
      });
      toast.success('Hero settings saved to S3 successfully');
    } catch (error: any) {
      console.error('Error saving hero settings:', error);
      const errorMessage = error?.response?.data?.message || 'Failed to save hero settings to S3';
      toast.error(errorMessage);
    } finally {
      setSavingAll(false);
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
    // Check required fields first with clear messages
    if (!blogForm.title.trim()) {
      toast.error('Blog title is required');
      return;
    }
    if (!isValidBlogTitle(blogForm.title)) {
      toast.error('Blog title contains invalid characters');
      return;
    }
    if (isBlogTitleTooLong(blogForm.title)) {
      toast.error('Blog title is too long');
      return;
    }
    
    if (!blogForm.excerpt.trim()) {
      toast.error('Blog excerpt is required');
      return;
    }
    if (!isValidBlogExcerpt(blogForm.excerpt)) {
      toast.error('Blog excerpt contains invalid characters');
      return;
    }
    if (isBlogExcerptTooLong(blogForm.excerpt)) {
      toast.error('Blog excerpt is too long');
      return;
    }
    
    if (!blogForm.content.trim()) {
      toast.error('Blog content is required');
      return;
    }
    if (!isValidBlogContent(blogForm.content)) {
      toast.error('Blog content contains invalid characters');
      return;
    }
    if (isBlogContentTooLong(blogForm.content)) {
      toast.error('Blog content is too long');
      return;
    }
    
    if (!blogForm.author.trim()) {
      toast.error('Blog author is required');
      return;
    }
    if (!isValidBlogAuthor(blogForm.author)) {
      toast.error('Blog author contains invalid characters');
      return;
    }
    if (isBlogAuthorTooLong(blogForm.author)) {
      toast.error('Blog author is too long');
      return;
    }
    
    if (!blogForm.readTime.trim()) {
      toast.error('Blog read time is required');
      return;
    }
    if (!isValidBlogReadTime(blogForm.readTime)) {
      toast.error('Blog read time contains invalid characters');
      return;
    }
    if (isBlogReadTimeTooLong(blogForm.readTime)) {
      toast.error('Blog read time is too long');
      return;
    }
    
    if (!blogForm.tags.trim()) {
      toast.error('Blog tags are required');
      return;
    }
    if (!isValidBlogTags(blogForm.tags)) {
      toast.error('Blog tags contain invalid characters');
      return;
    }
    if (isBlogTagsTooLong(blogForm.tags)) {
      toast.error('Blog tags are too long');
      return;
    }
    
    if (!blogForm.image.trim()) {
      toast.error('Blog image URL is required');
      return;
    }
    if (!isValidImageUrl(blogForm.image)) {
      toast.error('Blog image URL is invalid');
      return;
    }
    if (isImageUrlTooLong(blogForm.image)) {
      toast.error('Blog image URL is too long');
      return;
    }
    
    if (!blogForm.category) {
      toast.error('Category is required');
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
    if (!isValidCategoryName(categoryForm.name)) {
      toast.error('Category name contains invalid characters');
      return;
    }
    if (isCategoryNameTooLong(categoryForm.name)) {
      toast.error('Category name is too long');
      return;
    }
    if (!isValidCategoryDescription(categoryForm.description)) {
      toast.error('Category description contains invalid characters');
      return;
    }
    if (isCategoryDescriptionTooLong(categoryForm.description)) {
      toast.error('Category description is too long');
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
    if (!isValidCategoryName(categoryForm.name)) {
      toast.error('Category name contains invalid characters');
      return;
    }
    if (isCategoryNameTooLong(categoryForm.name)) {
      toast.error('Category name is too long');
      return;
    }
    if (!isValidCategoryDescription(categoryForm.description)) {
      toast.error('Category description contains invalid characters');
      return;
    }
    if (isCategoryDescriptionTooLong(categoryForm.description)) {
      toast.error('Category description is too long');
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
    setCareerFormErrors({});
  };

  const updateCareerFormField = (field: CareerFormField, value: string) => {
    setCareerForm((prev) => ({ ...prev, [field]: value }));
    const error = validateCareerField(field, value);
    setCareerFormErrors((prev) => ({ ...prev, [field]: error || undefined }));
  };

  const validateCareerForm = () => {
    const errors: Partial<Record<CareerFormField, string>> = {};
    for (const field of careerFormFields) {
      const error = validateCareerField(field, String(careerForm[field] ?? ''));
      if (error) errors[field] = error;
    }
    setCareerFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const careerInputClass = (field: CareerFormField) =>
    `w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all ${
      careerFormErrors[field] ? 'ring-2 ring-red-500 focus:ring-red-500' : ''
    }`;

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
    setCareerFormErrors({});
  };

  const loadCareerApplications = async (careerId: string) => {
    setSelectedCareerForApps(careerId);
    setLoadingCareerApplications(true);
    try {
      const applications = await careerService.getCareerApplications(careerId);
      setCareerApplications(Array.isArray(applications) ? applications : []);
    } catch (error) {
      setCareerApplications([]);
      toast.error('Failed to load career applications');
    } finally {
      setLoadingCareerApplications(false);
    }
  };

  const selectCareerForApplications = (career: Career) => {
    void loadCareerApplications(career._id);
  };

  const handleSaveCareer = async () => {
    if (!validateCareerForm()) {
      toast.error('Please fix the errors in the career form before saving');
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
    <GlobalSyncRefresh entities={['hero', 'blog', 'blogcategory', 'career', 'careerapplication']} onSync={(payload) => {
      fetchAllData();
      if (payload.entity === 'careerapplication' && selectedCareerForApps) {
        void loadCareerApplications(selectedCareerForApps);
      }
    }}>
    {loading ? (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
    ) : (
    <div className="max-w-6xl mx-auto p-4 lg:p-8 min-w-0 pb-24 lg:pb-8">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Edit website</h1>
          <p className="text-muted-foreground mt-1">Manage slides and hero banners across your application</p>
        </div>
      </div>

      <div className="space-y-12">
        {/* Home Page Carousel */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                <Layout className="w-6 h-6 text-blue-500" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold">Home Page Carousel</h2>
            </div>
            <div className="flex flex-col xs:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
              <button
                onClick={handleAddSlide}
                className="text-primary hover:bg-primary/10 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 shrink-0" />
                Add Slide
              </button>
              <button
                onClick={handleSaveHomeSlides}
                disabled={savingHomeSlides}
                className="bg-primary text-primary-foreground px-4 sm:px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-70"
              >
                {savingHomeSlides ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <Save className="w-4 h-4 shrink-0" />}
                {savingHomeSlides ? 'Saving...' : 'Save Slides'}
              </button>
            </div>
          </div>

          {/* CTA Button Toggles */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">CTA Button Visibility</h3>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="show-get-started" className="text-base">Show "Get Started" Button</Label>
                <Switch
                  id="show-get-started"
                  checked={showGetStarted}
                  onCheckedChange={setShowGetStarted}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="show-learn-more" className="text-base">Show "Learn More" Button</Label>
                <Switch
                  id="show-learn-more"
                  checked={showLearnMore}
                  onCheckedChange={setShowLearnMore}
                />
              </div>
            </div>
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
                                <Type className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${slideErrors[slide.id]?.titleWhite ? 'text-red-500' : 'text-muted-foreground'}`} />
                                <input 
                                  type="text"
                                  value={slide.titleWhite}
                                  onChange={(e) => handleUpdateSlide(slide.id, 'titleWhite', e.target.value)}
                                  className={`w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all ${slideErrors[slide.id]?.titleWhite ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                                  placeholder="White text..."
                                  maxLength={20}
                                />
                              </div>
                              {slideErrors[slide.id]?.titleWhite && (
                                <p className="text-xs text-red-500 mt-1">{slideErrors[slide.id].titleWhite}</p>
                              )}
                            </div>
                            <div>
                              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Title (Blue Text)</label>
                              <div className="relative">
                                <Type className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${slideErrors[slide.id]?.titleBlue ? 'text-red-500' : 'text-blue-500'}`} />
                                <input 
                                  type="text"
                                  value={slide.titleBlue}
                                  onChange={(e) => handleUpdateSlide(slide.id, 'titleBlue', e.target.value)}
                                  className={`w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all text-blue-600 ${slideErrors[slide.id]?.titleBlue ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                                  placeholder="Blue text..."
                                  maxLength={20}
                                />
                              </div>
                              {slideErrors[slide.id]?.titleBlue && (
                                <p className="text-xs text-red-500 mt-1">{slideErrors[slide.id].titleBlue}</p>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Subtitle / Description</label>
                            <div className="relative">
                              <AlignLeft className={`absolute left-3 top-3 w-4 h-4 ${slideErrors[slide.id]?.subtitle ? 'text-red-500' : 'text-muted-foreground'}`} />
                              <textarea 
                                value={slide.subtitle}
                                onChange={(e) => handleUpdateSlide(slide.id, 'subtitle', e.target.value)}
                                className={`w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[80px] resize-none ${slideErrors[slide.id]?.subtitle ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                                placeholder="Enter description..."
                                maxLength={150}
                              />
                            </div>
                            {slideErrors[slide.id]?.subtitle && (
                              <p className="text-xs text-red-500 mt-1">{slideErrors[slide.id].subtitle}</p>
                            )}
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
                    <div className="flex items-center gap-2">
                      <div className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground font-mono uppercase">
                        /{page.id}
                      </div>
                      <button
                        onClick={() => handleSaveSinglePageHero(page.id)}
                        disabled={savingPageId === page.id}
                        className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-all disabled:opacity-70"
                      >
                        {savingPageId === page.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {savingPageId === page.id ? 'Saving' : 'Save'}
                      </button>
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
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button 
                          onClick={() => triggerUpload('page', page.id)}
                          className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-all flex items-center gap-2"
                        >
                          {uploading === page.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          Change Banner
                        </button>
                        {hero.image && (
                          <button
                            onClick={() => handleUpdatePageHero(page.id, 'image', '')}
                            className="bg-red-500/80 backdrop-blur-md text-white p-2 rounded-lg hover:bg-red-600 transition-all flex items-center justify-center"
                            title="Remove Banner"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Title Override</label>
                        <input 
                          type="text"
                          value={hero.title}
                          onChange={(e) => handleUpdatePageHero(page.id, 'title', e.target.value)}
                          className={`w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all ${pageHeroErrors[page.id]?.title ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                          placeholder="Default Page Title"
                          maxLength={100}
                        />
                        {pageHeroErrors[page.id]?.title ? (
                          <p className="text-xs text-red-500 mt-1">{pageHeroErrors[page.id].title}</p>
                        ) : null}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Subtitle / Description</label>
                        <textarea 
                          value={hero.subtitle}
                          onChange={(e) => handleUpdatePageHero(page.id, 'subtitle', e.target.value)}
                          className={`w-full px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[60px] resize-none ${pageHeroErrors[page.id]?.subtitle ? 'ring-2 ring-red-500 focus:ring-red-500' : ''}`}
                          placeholder="Enter banner description..."
                          maxLength={300}
                        />
                        {pageHeroErrors[page.id]?.subtitle ? (
                          <p className="text-xs text-red-500 mt-1">{pageHeroErrors[page.id].subtitle}</p>
                        ) : null}
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
                              maxLength={500}
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
                              maxLength={50}
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

          <div className="flex flex-wrap items-center gap-2 mb-4">
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
            <div className="grid lg:grid-cols-3 gap-6 min-w-0 overflow-x-hidden">
              <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 min-w-0 overflow-hidden order-2 lg:order-1">
                <h3 className="font-bold text-lg">Categories</h3>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Category name"
                  className="w-full min-w-0 box-border px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all break-all"
                />
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Description (optional)"
                  className="w-full min-w-0 box-border px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[80px] resize-none"
                />
                <button
                  onClick={editingCategoryId ? handleSaveCategoryEdit : handleCreateCategory}
                  className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  {editingCategoryId ? 'Save Category' : 'Add Category'}
                </button>

                <div className="space-y-2 pt-2 max-h-64 overflow-y-auto overflow-x-hidden min-w-0">
                  {blogCategories.map((category) => (
                    <div key={category._id} className="flex items-start justify-between gap-2 bg-muted/40 hover:bg-muted/60 rounded-lg px-3 py-2 transition-colors min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium break-all [overflow-wrap:anywhere]">{category.name}</p>
                        {category.description ? (
                          <p className="text-[11px] text-muted-foreground break-all [overflow-wrap:anywhere] mt-0.5">{category.description}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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

              <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-sm min-w-0 overflow-hidden order-1 lg:order-2 flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <h3 className="font-bold text-lg">{blogForm._id ? 'Edit Blog' : 'Create Blog'}</h3>
                    <button onClick={resetBlogForm} className="text-sm text-primary hover:underline self-start sm:self-auto">New Blog</button>
                  </div>
                  <button
                    onClick={handleSaveBlog}
                    className="lg:hidden w-full px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm"
                  >
                    {blogForm._id ? 'Update Blog' : 'Create Blog'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-w-0">
                  <input type="text" value={blogForm.title} onChange={(e) => setBlogForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Blog title *" className="w-full min-w-0 box-border px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all break-all" />
                  <input type="text" value={blogForm.author} onChange={(e) => setBlogForm((prev) => ({ ...prev, author: e.target.value }))} placeholder="Author *" className="w-full min-w-0 box-border px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all break-all" />
                  <select value={blogForm.category} onChange={(e) => setBlogForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full min-w-0 box-border px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all truncate">
                    <option value="">Select category *</option>
                    {blogCategories.map((category) => (<option key={category._id} value={category._id}>{category.name.length > 48 ? `${category.name.slice(0, 48)}…` : category.name}</option>))}
                  </select>
                  <input type="text" value={blogForm.readTime} onChange={(e) => setBlogForm((prev) => ({ ...prev, readTime: e.target.value }))} placeholder="Read time (e.g. 5 min read) *" className="w-full min-w-0 box-border px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all" />
                </div>

                <textarea value={blogForm.excerpt} onChange={(e) => setBlogForm((prev) => ({ ...prev, excerpt: e.target.value }))} placeholder="Short excerpt *" className="w-full min-w-0 box-border px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[70px] resize-none break-all" />
                <textarea value={blogForm.content} onChange={(e) => setBlogForm((prev) => ({ ...prev, content: e.target.value }))} placeholder="Blog content *" className="w-full min-w-0 box-border px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all min-h-[120px] sm:min-h-[150px] resize-y break-all" />
                <input type="text" value={blogForm.tags} onChange={(e) => setBlogForm((prev) => ({ ...prev, tags: e.target.value }))} placeholder="Tags (comma-separated) *" className="w-full min-w-0 box-border px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all break-all" />
                <input type="text" value={blogForm.image} onChange={(e) => setBlogForm((prev) => ({ ...prev, image: e.target.value }))} placeholder="Image URL *" className="w-full min-w-0 box-border px-4 py-2 bg-muted/50 border-none rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all break-all" />

                <div className="sticky bottom-[5.5rem] lg:static z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 bg-card/95 backdrop-blur-md border border-border rounded-xl lg:rounded-none lg:border-0 lg:border-t lg:border-border lg:py-0 lg:mx-0 lg:px-0 lg:bg-transparent lg:backdrop-blur-none shadow-sm lg:shadow-none">
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 min-w-0">
                    <button onClick={() => triggerUpload('blog')} className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
                      Upload Image
                    </button>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground px-1">
                      <input type="checkbox" checked={blogForm.isPublished} onChange={(e) => setBlogForm((prev) => ({ ...prev, isPublished: e.target.checked }))} />
                      Published
                    </label>
                    <button onClick={handleSaveBlog} className="w-full sm:w-auto sm:ml-auto px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm">
                      {blogForm._id ? 'Update Blog' : 'Create Blog'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-1 lg:pt-3 border-t border-border max-h-72 overflow-y-auto overflow-x-hidden min-w-0">
                  {blogs.map((blog) => (
                    <div key={blog._id} className="flex items-start justify-between gap-3 bg-muted/40 hover:bg-muted/60 rounded-lg px-3 py-2 transition-colors min-w-0">
                      <div className="min-w-0 flex items-start gap-2 flex-1">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${blog.isPublished ? 'bg-emerald-500' : 'bg-amber-500'}`} title={blog.isPublished ? 'Published' : 'Draft'} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm break-words [overflow-wrap:anywhere]">{blog.title}</p>
                          <p className="text-xs text-muted-foreground break-words [overflow-wrap:anywhere]">{typeof blog.category === 'string' ? '' : blog.category?.name} • {blog.isPublished ? 'Published' : 'Draft'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
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
                  <div>
                    <input type="text" value={careerForm.title} onChange={(e) => updateCareerFormField('title', e.target.value)} placeholder="Job title" maxLength={MAX_CAREER_TITLE_LENGTH} className={careerInputClass('title')} />
                    {careerFormErrors.title ? <p className="text-xs text-red-500 mt-1">{careerFormErrors.title}</p> : null}
                  </div>
                  <div>
                    <input type="text" value={careerForm.department} onChange={(e) => updateCareerFormField('department', e.target.value)} placeholder="Department" maxLength={MAX_CAREER_DEPARTMENT_LENGTH} className={careerInputClass('department')} />
                    {careerFormErrors.department ? <p className="text-xs text-red-500 mt-1">{careerFormErrors.department}</p> : null}
                  </div>
                  <div>
                    <input type="text" value={careerForm.location} onChange={(e) => updateCareerFormField('location', e.target.value)} placeholder="Location" maxLength={MAX_CAREER_LOCATION_LENGTH} className={careerInputClass('location')} />
                    {careerFormErrors.location ? <p className="text-xs text-red-500 mt-1">{careerFormErrors.location}</p> : null}
                  </div>
                  <div>
                    <input type="text" value={careerForm.type} onChange={(e) => updateCareerFormField('type', e.target.value)} placeholder="Type (e.g. Full-time)" maxLength={MAX_CAREER_TYPE_LENGTH} className={careerInputClass('type')} />
                    {careerFormErrors.type ? <p className="text-xs text-red-500 mt-1">{careerFormErrors.type}</p> : null}
                  </div>
                  <div>
                    <input type="text" value={careerForm.salary} onChange={(e) => updateCareerFormField('salary', e.target.value)} placeholder="Salary (e.g. ₹8L - ₹12L)" maxLength={MAX_CAREER_SALARY_LENGTH} className={careerInputClass('salary')} />
                    {careerFormErrors.salary ? <p className="text-xs text-red-500 mt-1">{careerFormErrors.salary}</p> : null}
                  </div>
                  <div>
                    <input type="text" value={careerForm.applyUrl} onChange={(e) => updateCareerFormField('applyUrl', e.target.value)} placeholder="Apply URL (optional)" maxLength={MAX_CAREER_APPLY_URL_LENGTH} className={careerInputClass('applyUrl')} />
                    {careerFormErrors.applyUrl ? <p className="text-xs text-red-500 mt-1">{careerFormErrors.applyUrl}</p> : null}
                  </div>
                </div>

                <div>
                  <textarea value={careerForm.shortDescription} onChange={(e) => updateCareerFormField('shortDescription', e.target.value)} placeholder="Short description" maxLength={MAX_CAREER_SHORT_DESCRIPTION_LENGTH} className={`${careerInputClass('shortDescription')} min-h-[80px] resize-none`} />
                  {careerFormErrors.shortDescription ? <p className="text-xs text-red-500 mt-1">{careerFormErrors.shortDescription}</p> : null}
                </div>

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
                    <div
                      key={career._id}
                      className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors ${
                        selectedCareerForApps === career._id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-muted/40 hover:bg-muted/60'
                      }`}
                    >
                      <button
                        onClick={() => selectCareerForApplications(career)}
                        className="min-w-0 text-left flex-1"
                        title="View applications for this role"
                      >
                        <p className="font-medium text-sm truncate">{career.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {career.department} • {career.isActive ? 'Active' : 'Inactive'}
                          {(career.applicationCount ?? 0) > 0 ? ` • ${career.applicationCount} application${career.applicationCount === 1 ? '' : 's'}` : ''}
                        </p>
                      </button>
                      <div className="flex items-center gap-1">
                        {(career.applicationCount ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            <Users className="w-3 h-3" />
                            {career.applicationCount}
                          </span>
                        ) : null}
                        <button
                          onClick={() => navigate(`/admin/careers/${career._id}`)}
                          className="p-1.5 rounded-md hover:bg-background text-muted-foreground"
                          title="Open full career page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button onClick={() => editCareer(career)} className="p-1.5 rounded-md hover:bg-background text-primary" title="Edit career"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteCareer(career._id)} className="p-1.5 rounded-md hover:bg-red-50 text-red-600" title="Delete career"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-3 bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-lg">Career Applications</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedCareerForApps
                        ? `Showing applications for ${careers.find((career) => career._id === selectedCareerForApps)?.title || 'selected role'}`
                        : 'Select a posted career to view submitted applications'}
                    </p>
                  </div>
                  {selectedCareerForApps ? (
                    <button
                      onClick={() => navigate(`/admin/careers/${selectedCareerForApps}`)}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      Open full page
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>

                {!selectedCareerForApps ? (
                  <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    Applications submitted from the public Careers page will appear here.
                  </div>
                ) : loadingCareerApplications ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading applications...
                  </div>
                ) : careerApplications.length === 0 ? (
                  <div className="rounded-xl border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                    No applications yet for this role.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {careerApplications.map((application) => (
                      <div key={application._id} className="rounded-xl border border-border p-4 bg-muted/20">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{application.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {application.email} • {application.mobileNumber}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-muted border border-border capitalize">
                            {application.status}
                          </span>
                        </div>
                        {application.additionalMessage ? (
                          <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">
                            {application.additionalMessage}
                          </p>
                        ) : null}
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <a
                            href={application.resumeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                          >
                            <FileText className="w-4 h-4" />
                            View Resume
                          </a>
                          <span className="text-xs text-muted-foreground">
                            {application.createdAt ? new Date(application.createdAt).toLocaleString() : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
