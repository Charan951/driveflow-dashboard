import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Clock, ChevronLeft } from 'lucide-react';
import { blogService, BlogPost } from '@/services/blogService';
import { heroService } from '@/services/heroService';

const BlogDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [heroImage, setHeroImage] = useState(
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2000'
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!id) return;
        const [blogData, heroData] = await Promise.all([
          blogService.getPublicBlogById(id),
          heroService.getHeroSettings(),
        ]);

        setBlog(blogData);
        const pageHero = heroData.pageHeroes?.blog;
        if (pageHero?.image) {
          setHeroImage(pageHero.image);
        }
      } catch (error) {
        setBlog(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading blog...</div>;
  }

  if (!blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Blog not found</h1>
        <Link to="/blog" className="text-primary hover:underline">
          Back to blogs
        </Link>
      </div>
    );
  }

  const categoryName = typeof blog.category === 'string' ? blog.category : blog.category?.name;

  return (
    <div className="min-h-screen bg-background pb-20">
      <section className="relative h-[320px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={blog.image || heroImage} alt={blog.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/60" />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-white">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm mb-6 text-white/90 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
            Back to blogs
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold max-w-4xl">{blog.title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-white/90">
            <span className="px-3 py-1 bg-white/15 rounded-full">{categoryName}</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(blog.publishedAt || blog.createdAt || Date.now()).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {blog.readTime || '5 min read'}
            </span>
            <span>By {blog.author}</span>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <p className="text-lg text-muted-foreground mb-8">{blog.excerpt}</p>
        <article className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap leading-8">
          {blog.content}
        </article>
      </main>
    </div>
  );
};

export default BlogDetail;
