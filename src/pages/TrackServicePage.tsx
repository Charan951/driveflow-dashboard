import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Phone, 
  MapPin, 
  Clock, 
  Car,
  ChevronLeft
} from 'lucide-react';
import { orders } from '@/services/dummyData';
import Timeline from '@/components/Timeline';

const TrackServicePage: React.FC = () => {
  const { id } = useParams();
  const order = orders.find(o => o.id === id) || orders[0];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/dashboard"
          className="p-2 hover:bg-muted rounded-xl transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Track Service</h1>
          <p className="text-sm text-muted-foreground">Order #{order.id}</p>
        </div>
      </div>

      {/* Vehicle Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-2xl border border-border p-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden">
            {order.vehicle.image ? (
              <img src={order.vehicle.image} alt={order.vehicle.model} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Car className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">
              {order.vehicle.year} {order.vehicle.make} {order.vehicle.model}
            </h3>
            <p className="text-sm text-muted-foreground">{order.vehicle.licensePlate}</p>
            <p className="text-sm text-primary font-medium mt-1">{order.service}</p>
          </div>
        </div>
      </motion.div>

      {/* Progress Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-6">Service Progress</h2>
        <Timeline steps={order.progress} />
      </motion.div>

      {/* Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border overflow-hidden"
      >
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Live Location
          </h2>
        </div>
        <div className="h-64 bg-muted relative">
          {/* Google Maps Iframe Mock */}
          <iframe
            src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.2!2d${order.location.lng}!3d${order.location.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDQyJzQ2LjEiTiA3NMKwMDAnMjEuNiJX!5e0!3m2!1sen!2sus!4v1234567890`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Location Map"
          />
          {/* Overlay with current status */}
          <div className="absolute bottom-4 left-4 right-4 bg-card/95 backdrop-blur-xl rounded-xl p-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <p className="font-medium text-foreground">In Transit to Service Center</p>
              </div>
              <div className="flex items-center gap-2 text-accent">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">ETA: 15 mins</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Merchant Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-2xl border border-border p-4"
      >
        <h2 className="font-semibold text-foreground mb-3">Service Center</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">{order.merchant.name}</p>
            <p className="text-sm text-muted-foreground">{order.merchant.address}</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm text-warning">★</span>
              <span className="text-sm font-medium">{order.merchant.rating}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-3 bg-muted rounded-xl hover:bg-muted/80 transition-colors">
              <Phone className="w-5 h-5 text-foreground" />
            </button>
            <Link
              to={`/chat/${order.id}`}
              className="p-3 bg-primary rounded-xl hover:bg-primary/90 transition-colors"
            >
              <MessageCircle className="w-5 h-5 text-primary-foreground" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Floating Chat Button */}
      <Link
        to={`/chat/${order.id}`}
        className="fixed bottom-24 right-4 lg:bottom-8 lg:right-8 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-xl hover:bg-primary/90 transition-colors pulse-glow z-40"
      >
        <MessageCircle className="w-6 h-6 text-primary-foreground" />
      </Link>
    </div>
  );
};

export default TrackServicePage;
