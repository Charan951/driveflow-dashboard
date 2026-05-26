import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Ticket } from 'lucide-react';
import { couponService, Coupon } from '@/services/couponService';
import { useAuthStore } from '@/store/authStore';

const CARD_HEIGHT = 82;
const CARD_GAP = 16;
const MIN_CARD_WIDTH = 168;
const MAX_CARD_WIDTH = 220;

function filterCoupons(coupons: Coupon[], user: ReturnType<typeof useAuthStore.getState>['user']) {
  const now = Date.now();
  return coupons.filter((c) => {
    if (!c.isActive) return false;
    if (c.validUntil) {
      const until = new Date(c.validUntil).getTime();
      if (!Number.isNaN(until) && until < now) return false;
    }
    if (c.targetUsers && c.targetUsers.length > 0) {
      const isTargeted = c.targetUsers.some(
        (target) =>
          (user?.email &&
            target.email &&
            target.email.toLowerCase() === user.email.toLowerCase()) ||
          (user?.phone && target.mobile && target.mobile === user.phone),
      );
      if (!isTargeted) return false;
    }
    return true;
  });
}

function getCardWidth(code: string): number {
  const calculated = (code.length * 12) / 3 * 7 + 80;
  return Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, calculated));
}

function CouponTicket({ coupon, width }: { coupon: Coupon; width: number }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 14 }}
      className="relative shrink-0 overflow-hidden rounded-xl border border-[#93C5FD]/55 bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:border-blue-500/45 dark:from-[#1E3A5F] dark:to-[#172554]"
      style={{ width, height: CARD_HEIGHT }}
    >
      <Ticket
        className="pointer-events-none absolute -right-2 -top-2 h-[52px] w-[52px] rotate-[6deg] text-[#4D95F9]/10 dark:text-blue-400/12"
        strokeWidth={1.5}
      />

      <div className="absolute left-[-6px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white dark:bg-background" />
      <div className="absolute right-[-6px] top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white dark:bg-background" />

      <div className="relative flex h-full items-center px-2.5 py-2">
        <div className="min-w-0 flex-[3]">
          <div className="mb-0.5 flex items-center gap-1">
            <Tag className="h-2 w-2 text-[#146EEC] dark:text-blue-300" strokeWidth={3} />
            <span className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-600 dark:text-blue-200">
              OFFER
            </span>
          </div>
          <p className="truncate text-[14px] font-black uppercase leading-tight text-slate-900 dark:text-slate-50">
            {coupon.code}
          </p>
        </div>

        <div className="mx-1.5 h-[28px] w-px shrink-0 bg-blue-600/35 dark:bg-blue-400/35" />

        <div className="min-w-0 flex-[4]">
          <p className="text-[13px] font-black leading-tight text-slate-900 dark:text-slate-50">
            {coupon.discountPercentage}% OFF
          </p>
          <p className="mt-0.5 text-[8px] font-bold text-slate-600 dark:text-blue-200/80">
            Min. ₹{coupon.minOrderAmount ?? 0}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

const CouponSlider: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const data = await couponService.getCoupons();
        setCoupons(filterCoupons(data, user));
      } catch (error) {
        console.error('Failed to fetch coupons:', error);
        setCoupons([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCoupons();
  }, [user]);

  if (loading || coupons.length === 0) return null;

  const displayCoupons = [...coupons, ...coupons, ...coupons, ...coupons];
  const totalSetWidth = coupons.reduce((sum, coupon) => {
    return sum + getCardWidth(coupon.code) + CARD_GAP;
  }, 0);

  return (
    <div className="relative w-full overflow-hidden py-2">
      <motion.div
        className="flex px-4"
        style={{ width: 'fit-content', gap: CARD_GAP }}
        animate={{ x: [0, -totalSetWidth] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: 'loop',
            duration: coupons.length * 6,
            ease: 'linear',
          },
        }}
      >
        {displayCoupons.map((coupon, index) => (
          <CouponTicket
            key={`${coupon._id}-${index}`}
            coupon={coupon}
            width={getCardWidth(coupon.code)}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default CouponSlider;
