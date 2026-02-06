import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Car, 
  Calendar, 
  ChevronRight, 
  Plus,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';
import { vehicles, orders, services } from '@/services/dummyData';
import { staggerContainer, staggerItem } from '@/animations/variants';
import VehicleCard from '@/components/VehicleCard';
import OrderCard from '@/components/OrderCard';
import CounterCard from '@/components/CounterCard';

const DashboardPage: React.FC = () => {
  const vehiclesRef = useRef<HTMLDivElement>(null);

  const upcomingBooking = orders.find(o => o.status !== 'completed');
  const pastServices = orders.filter(o => o.status === 'completed');

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">Good Morning! 👋</h1>
          <p className="text-muted-foreground">Manage your vehicles and services</p>
        </div>
        <Link
          to="/book-service"
          className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Book Service
        </Link>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CounterCard
          label="Total Vehicles"
          value={vehicles.length}
          icon={<Car className="w-5 h-5 text-primary" />}
          delay={0}
        />
        <CounterCard
          label="Active Bookings"
          value={orders.filter(o => o.status !== 'completed').length}
          icon={<Calendar className="w-5 h-5 text-primary" />}
          delay={1}
        />
        <CounterCard
          label="Services Done"
          value={12}
          icon={<Clock className="w-5 h-5 text-primary" />}
          trend={{ value: 15, isPositive: true }}
          delay={2}
        />
        <CounterCard
          label="Total Spent"
          value="$2,450"
          icon={<MapPin className="w-5 h-5 text-primary" />}
          delay={3}
        />
      </div>

      {/* Upcoming Booking */}
      {upcomingBooking && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-primary rounded-2xl p-5 text-primary-foreground"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-primary-foreground/70 mb-1">Upcoming Service</p>
              <h3 className="text-lg font-semibold">{upcomingBooking.service}</h3>
            </div>
            <span className="px-3 py-1 bg-primary-foreground/20 rounded-full text-xs font-medium">
              {upcomingBooking.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">{upcomingBooking.scheduledDate}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{upcomingBooking.scheduledTime}</span>
            </div>
          </div>
          <Link
            to={`/track/${upcomingBooking.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-foreground text-primary rounded-xl text-sm font-medium hover:bg-primary-foreground/90 transition-colors"
          >
            Track Service
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      )}

      {/* My Vehicles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">My Vehicles</h2>
          <Link to="/add-vehicle" className="text-sm text-primary font-medium flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div 
          ref={vehiclesRef}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0"
        >
          {vehicles.map((vehicle, index) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <VehicleCard
                {...vehicle}
                onClick={() => {}}
              />
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: vehicles.length * 0.1 }}
          >
            <Link
              to="/add-vehicle"
              className="flex flex-col items-center justify-center min-w-[280px] h-[230px] bg-muted/50 border-2 border-dashed border-border rounded-2xl hover:border-primary hover:bg-muted transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <p className="font-medium text-foreground">Add Vehicle</p>
              <p className="text-sm text-muted-foreground">Register a new vehicle</p>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Quick Services */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Quick Services</h2>
          <Link to="/services" className="text-sm text-primary font-medium flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {services.filter(s => s.popular).slice(0, 4).map((service) => (
            <motion.div key={service.id} variants={staggerItem}>
              <Link
                to="/book-service"
                className="flex flex-col items-center p-4 bg-card rounded-2xl border border-border hover:border-primary hover:shadow-card transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground text-center">{service.name}</p>
                <p className="text-xs text-muted-foreground mt-1">${service.price}</p>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Past Services */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Services</h2>
        </div>
        <div className="space-y-3">
          {orders.slice(0, 3).map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <OrderCard
                id={order.id}
                service={order.service}
                vehicle={{
                  make: order.vehicle.make,
                  model: order.vehicle.model,
                  licensePlate: order.vehicle.licensePlate,
                }}
                status={order.status}
                scheduledDate={order.scheduledDate}
                scheduledTime={order.scheduledTime}
                price={order.price}
                onClick={() => {}}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
