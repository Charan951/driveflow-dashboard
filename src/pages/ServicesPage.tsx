import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  Paintbrush, 
  Shield, 
  Search,
  Filter,
  ChevronRight
} from 'lucide-react';
import { services } from '@/services/dummyData';
import ServiceCard from '@/components/ServiceCard';
import { staggerContainer, staggerItem } from '@/animations/variants';

const categories = [
  { id: 'all', label: 'All', icon: null },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'bodyshop', label: 'Body Shop', icon: Paintbrush },
  { id: 'insurance', label: 'Insurance', icon: Shield },
];

const ServicesPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredServices = services.filter((service) => {
    const matchesCategory = activeCategory === 'all' || service.category === activeCategory;
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Services</h1>
        <p className="text-muted-foreground">Browse and book vehicle services</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search services..."
          className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-colors ${
              activeCategory === category.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {category.icon && <category.icon className="w-4 h-4" />}
            {category.label}
          </button>
        ))}
      </div>

      {/* Popular Services */}
      {activeCategory === 'all' && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Popular Services</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
            {services.filter(s => s.popular).map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="min-w-[280px]"
              >
                <Link to="/book-service">
                  <ServiceCard
                    icon={Wrench}
                    name={service.name}
                    description={service.description}
                    price={service.price}
                    duration={service.duration}
                    popular={service.popular}
                  />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* All Services Grid */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {activeCategory === 'all' ? 'All Services' : categories.find(c => c.id === activeCategory)?.label}
        </h2>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredServices.map((service) => (
            <motion.div key={service.id} variants={staggerItem}>
              <Link to="/book-service">
                <ServiceCard
                  icon={Wrench}
                  name={service.name}
                  description={service.description}
                  price={service.price}
                  duration={service.duration}
                  popular={service.popular}
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {filteredServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No services found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicesPage;
