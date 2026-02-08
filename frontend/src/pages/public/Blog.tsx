import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, Clock, User, ArrowRight, Tag } from 'lucide-react';
import { Link } from 'react-router-dom';

// Blog Data
const blogPosts = [
  {
    id: 1,
    title: '10 Essential Maintenance Tips for Your Car',
    excerpt: 'Keep your vehicle running smoothly with these fundamental maintenance practices that every car owner should know.',
    category: 'Maintenance',
    author: 'Mike Anderson',
    date: 'Oct 15, 2023',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 2,
    title: 'The Future of Electric Vehicles: What to Expect',
    excerpt: 'Explore the upcoming trends in the EV market, from battery technology breakthroughs to charging infrastructure.',
    category: 'Technology',
    author: 'Sarah Jenkins',
    date: 'Oct 12, 2023',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 3,
    title: 'Winter Driving Safety Guide',
    excerpt: 'Prepare yourself and your vehicle for harsh winter conditions with our comprehensive safety guide.',
    category: 'Safety',
    author: 'David Wilson',
    date: 'Oct 10, 2023',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 4,
    title: 'How to Choose the Right Tires',
    excerpt: 'Understanding tire specifications and choosing the perfect set for your driving style and climate.',
    category: 'Parts',
    author: 'Tom Harris',
    date: 'Oct 08, 2023',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1578844251758-2f71da645217?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 5,
    title: 'Ultimate Road Trip Checklist',
    excerpt: 'Planning a long drive? Make sure you have everything you need for a safe and enjoyable journey.',
    category: 'Lifestyle',
    author: 'Emily Parker',
    date: 'Oct 05, 2023',
    readTime: '8 min read',
    image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 6,
    title: 'Understanding Your Car Insurance Policy',
    excerpt: 'Demystifying the complex terms in your insurance policy to ensure you have the coverage you need.',
    category: 'Insurance',
    author: 'James Roberts',
    date: 'Oct 01, 2023',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 7,
    title: 'DIY Car Cleaning Hacks',
    excerpt: 'Professional detailing secrets you can do at home to make your car look brand new.',
    category: 'Car Care',
    author: 'Lisa Chen',
    date: 'Sep 28, 2023',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 8,
    title: 'The Rise of Autonomous Driving',
    excerpt: 'How self-driving technology is reshaping the automotive industry and what it means for drivers.',
    category: 'Technology',
    author: 'Mark Stevenson',
    date: 'Sep 25, 2023',
    readTime: '9 min read',
    image: 'https://images.unsplash.com/photo-1485291571150-772bcfc10da5?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 9,
    title: 'Fuel Efficiency Tips to Save Money',
    excerpt: 'Simple driving habits and maintenance tricks to improve your gas mileage and save at the pump.',
    category: 'Maintenance',
    author: 'Alex Thompson',
    date: 'Sep 22, 2023',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1565514020128-090c01e6a2d9?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 10,
    title: 'Classic Cars: Investment or Passion?',
    excerpt: 'Analyzing the market for vintage automobiles and what to look for when buying a classic.',
    category: 'Lifestyle',
    author: 'Robert Cole',
    date: 'Sep 18, 2023',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 11,
    title: 'Brake System Warning Signs',
    excerpt: 'Don\'t ignore these critical sounds and feelings that indicate your brakes need immediate attention.',
    category: 'Safety',
    author: 'Jennifer Wu',
    date: 'Sep 15, 2023',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 12,
    title: 'Best Family SUVs of 2024',
    excerpt: 'A comprehensive comparison of the top family-friendly SUVs focusing on safety, space, and reliability.',
    category: 'Reviews',
    author: 'Chris Martin',
    date: 'Sep 12, 2023',
    readTime: '10 min read',
    image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 13,
    title: 'Car Battery Maintenance 101',
    excerpt: 'Everything you need to know about extending the life of your car battery and preventing dead starts.',
    category: 'Maintenance',
    author: 'Pat Collins',
    date: 'Sep 10, 2023',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 14,
    title: 'The Psychology of Road Rage',
    excerpt: 'Understanding the causes of aggressive driving and techniques to stay calm behind the wheel.',
    category: 'Safety',
    author: 'Dr. Emily Ross',
    date: 'Sep 05, 2023',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 15,
    title: 'Eco-Friendly Driving Habits',
    excerpt: 'Reduce your carbon footprint with these environmentally conscious driving practices.',
    category: 'Lifestyle',
    author: 'Green Drive Team',
    date: 'Sep 01, 2023',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1550523119-92d9d23003f8?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 16,
    title: 'Preparing for a Track Day',
    excerpt: 'A beginner\'s guide to taking your daily driver to the race track safely and responsibly.',
    category: 'Motorsport',
    author: 'Ryan Speed',
    date: 'Aug 28, 2023',
    readTime: '8 min read',
    image: 'https://images.unsplash.com/photo-1547754980-3df97fed72a8?auto=format&fit=crop&q=80&w=800'
  }
];

const categories = ['All', 'Maintenance', 'Technology', 'Safety', 'Lifestyle', 'Car Care'];

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=2000"
            alt="Blog Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              DriveFlow Blog
            </h1>
            <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto leading-relaxed">
              Insights, tips, and news from the world of automotive care and technology.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16 -mt-20 relative z-20">
        {/* Search and Filter Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="bg-card/50 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-border/50 mb-12"
        >
          {/* Search Bar */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-background border border-border shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            />
          </div>

          {/* Categories */}
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                    : 'bg-background hover:bg-accent border border-border'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Blog Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 + 0.3 }}
              className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-background/90 backdrop-blur-sm rounded-full text-xs font-medium border border-border">
                    {post.category}
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{post.author}</span>
                  </div>
                  <Link 
                    to={`/blog/${post.id}`}
                    className="flex items-center gap-1 text-sm font-medium text-primary hover:gap-2 transition-all"
                  >
                    Read <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-20 bg-card rounded-3xl border border-border">
            <p className="text-muted-foreground text-lg">No articles found matching your criteria.</p>
            <button 
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
              className="mt-4 text-primary hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
