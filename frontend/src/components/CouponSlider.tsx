import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { couponService, Coupon } from '@/services/couponService';
import { Ticket } from 'lucide-react';

const COLORS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-pink-600',
  'bg-orange-600',
  'bg-green-600',
  'bg-indigo-600',
  'bg-rose-600',
  'bg-amber-600',
];

const CouponSlider: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const data = await couponService.getCoupons();
        const activeCoupons = data.filter(c => c.isActive);
        setCoupons(activeCoupons);
      } catch (error) {
        console.error('Failed to fetch coupons:', error);
        setCoupons([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCoupons();
  }, []);

  if (loading || coupons.length === 0) return null;
  // Create enough copies for a smooth infinite loop
  const displayCoupons = [...coupons, ...coupons, ...coupons, ...coupons];
  const CARD_WIDTH = 280;
  const GAP = 24;
  const TOTAL_SET_WIDTH = (CARD_WIDTH + GAP) * coupons.length;

  return (
    <div className="w-full overflow-hidden py-6 relative">
      {/* Gradient Overlays for smooth fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />

      <div className="relative w-full">
        <motion.div
          className="flex gap-6 px-4"
          animate={{
            x: [0, -TOTAL_SET_WIDTH],
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: coupons.length * 8, // Slightly faster, consistent speed
              ease: "linear",
            },
          }}
          style={{ width: 'fit-content' }}
        >
          {displayCoupons.map((coupon, index) => (
            <motion.div
              key={`${coupon._id}-${index}`}
              whileHover={{ scale: 1.05, y: -5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
              className="flex-shrink-0 w-[280px] h-36 rounded-2xl bg-[#D4AF37] border-2 border-[#996515]/20 p-6 flex flex-col justify-between text-black/80 relative overflow-hidden shadow-[0_8px_30px_rgb(212,175,55,0.2)] bg-gradient-to-br from-[#D4AF37] to-[#C49E2D]"
            >
              {/* Background Decoration */}
              <div className="absolute -top-6 -right-6 opacity-10 text-white">
                <Ticket className="w-32 h-32 rotate-12" />
              </div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/20 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-black/10 rounded-lg">
                    <Ticket className="w-3.5 h-3.5" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-80">Premium Offer</p>
                </div>
                <h4 className="text-3xl font-black tracking-tighter drop-shadow-sm uppercase">{coupon.code}</h4>
                {coupon.description && (
                  <p className="text-[11px] font-medium opacity-70 mt-1 line-clamp-1">{coupon.description}</p>
                )}
              </div>
              
              <div className="relative z-10 flex justify-between items-end border-t-2 border-black/10 pt-4 mt-auto">
                <div>
                  <p className="text-2xl font-black leading-none">{coupon.discountPercentage}% OFF</p>
                  <p className="text-[10px] opacity-60 mt-1 uppercase font-black tracking-widest">Luxury Deal</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black">Min. ₹{coupon.minOrderAmount}</p>
                  <p className="text-[9px] opacity-50 uppercase font-bold">Order Value</p>
                </div>
              </div>

              {/* Card Notch Effect */}
              <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white rounded-full -translate-y-1/2 shadow-inner" />
              <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white rounded-full -translate-y-1/2 shadow-inner" />
              
              {/* Dashed line connector for notch */}
              <div className="absolute top-1/2 left-0 right-0 border-t-2 border-dashed border-black/5 -translate-y-1/2 pointer-events-none" />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default CouponSlider;
