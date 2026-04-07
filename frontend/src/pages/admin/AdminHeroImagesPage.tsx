import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Trash2, 
  Plus, 
  Save, 
  RefreshCw, 
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
import { toast } from 'sonner';

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
  const [homeSlides, setHomeSlides] = useState<HeroSlide[]>([]);
  const [pageHeroes, setPageHeroes] = useState<Record<string, PageHero>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<{ type: 'home' | 'page', id?: string | number }>({ type: 'home' });

  useEffect(() => {
    fetchHeroSettings();
  }, []);

  const fetchHeroSettings = async () => {
    try {
      const data = await heroService.getHeroSettings();
      
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
    } catch (error) {
      toast.error('Failed to load hero settings from S3');
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

  const triggerUpload = (type: 'home' | 'page', id?: string | number) => {
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
      }
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await heroService.updateHeroSettings({
        homeSlides,
        pageHeroes
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Hero Image Management</h1>
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
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Hidden File Input */}
      <input 
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};

export default AdminHeroImagesPage;
