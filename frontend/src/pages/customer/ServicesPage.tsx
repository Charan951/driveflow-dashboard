import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Wrench, 
  Paintbrush, 
  Shield, 
  Search,
  Droplets,
  Disc,
  Hammer,
  Sparkles,
  Snowflake,
  Package,
  Circle
} from 'lucide-react';
import { serviceService, Service } from '@/services/serviceService';
import ServiceCard from '@/components/ServiceCard';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { toast } from 'sonner';

const categories = [
  { id: 'all', label: 'All Services', icon: null },
  { id: 'Periodic', label: 'Periodic Service', icon: Wrench },
  { id: 'Repair', label: 'Engine Repair', icon: Wrench },
  { id: 'Detailing', label: 'Detailing & Coating', icon: Sparkles },
  { id: 'Denting', label: 'Denting & Painting', icon: Hammer },
  { id: 'Wash', label: 'Wash & Polish', icon: Droplets },
  { id: 'Tyres', label: 'Tyres & Wheels', icon: Disc },
  { id: 'AC', label: 'AC Service', icon: Snowflake },
  { id: 'Accessories', label: 'Accessories', icon: Package },
];

const getIconForCategory = (category: string) => {
  switch (category) {
    case 'Periodic': return Wrench;
    case 'Repair': return Wrench;
    case 'Wash': return Droplets;
    case 'Tyres': return Disc;
    case 'Denting': return Hammer;
    case 'Painting': return Paintbrush;
    case 'Detailing': return Sparkles;
    case 'AC': return Snowflake;
    case 'Accessories': return Package;
    default: return Circle;
  }
};

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setIsLoading(true);
      const data = await serviceService.getServices();
      setServices(data);
    } catch (error) {
      toast.error('Failed to load services');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesCategory = activeCategory === 'all' || service.category === activeCategory;
    
    // Handle grouped categories for filtering
    let matchesGroupedCategory = matchesCategory;
    if (activeCategory === 'Denting' && (service.category === 'Denting' || service.category === 'Painting')) {
        matchesGroupedCategory = true;
    }
    
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // If activeCategory is 'Denting', use matchesGroupedCategory, else use matchesCategory
    const categoryCheck = activeCategory === 'Denting' ? matchesGroupedCategory : matchesCategory;

    return categoryCheck && matchesSearch;
  });

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Services</h1>
        <p className="text-muted-foreground">Professional services for your vehicle</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for services (e.g. Oil Change, Brake Repair)..."
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

      {/* Services Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading services...</div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            {categories.find(c => c.id === activeCategory)?.label || 'Services'}
          </h2>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredServices.map((service) => (
              <motion.div key={service._id} variants={staggerItem}>
                <Link to="/book-service">
                  <ServiceCard
                    icon={getIconForCategory(service.category)}
                    name={service.name}
                    description={service.description}
                    price={service.price}
                    duration={service.duration ? `${service.duration} mins` : undefined}
                    popular={false}
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
      )}
    </div>
  );
};

export default ServicesPage;
