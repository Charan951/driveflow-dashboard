import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { serviceService, Service } from '@/services/serviceService';
import { toast } from 'sonner';

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await serviceService.getServices();
        setServices(data);
      } catch (error) {
        toast.error('Failed to fetch services');
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const categories = ['Services', 'Periodic', 'Wash', 'Car Wash', 'Tyre & Battery', 'Tyres', 'Battery', 'Painting', 'Denting', 'Repair', 'Detailing', 'AC', 'Accessories', 'Essentials', 'Other'];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Our Services</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="space-y-8">
          {categories.map((category) => (
            <div key={category}>
              <h2 className="text-xl font-bold mb-4">{category}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {services
                  .filter((service) => service.category === category)
                  .map((service) => (
                    <Link to={`/services/${service._id}`} key={service._id}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card p-4 rounded-lg shadow-sm border border-border"
                      >
                        <img src={service.image} alt={service.name} className="w-full h-32 rounded-md object-cover mb-4" />
                        <h2 className="text-lg font-semibold">{service.name}</h2>
                      </motion.div>
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
