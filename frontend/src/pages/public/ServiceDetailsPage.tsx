import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { serviceService, Service } from '@/services/serviceService';
import { toast } from 'sonner';
import { Check } from 'lucide-react';

const ServiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const data = await serviceService.getService(id);
        setService(data);
      } catch (error) {
        toast.error('Failed to fetch service details');
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [id]);

  return (
    <div className="p-6">
      {loading ? (
        <p>Loading...</p>
      ) : service ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <img src={service.image} alt={service.name} className="w-full h-auto rounded-lg shadow-lg" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">{service.name}</h1>
            <p className="text-lg text-muted-foreground mb-4">{service.description}</p>
            
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">What's Included</h2>
              <ul className="space-y-2">
                {service.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Service Price</p>
                <p className="text-2xl font-bold text-primary">₹{service.price}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-2xl font-bold">{service.duration} mins</p>
              </div>
            </div>

            <Link to={`/book-service?service=${service._id}`}>
              <button className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold">
                Book Now
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <p>Service not found.</p>
      )}
    </div>
  );
};

export default ServiceDetailsPage;
