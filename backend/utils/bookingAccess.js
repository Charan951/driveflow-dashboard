export const canAccessBooking = (booking, user) => {
  if (!user) return false;
  const userId = user._id.toString();
  if (user.role === 'admin') return true;
  const ownerId = booking.user?._id?.toString() || booking.user?.toString();
  if (ownerId === userId) return true;
  if (user.role === 'merchant' && booking.merchant) {
    const merchantId = booking.merchant._id?.toString() || booking.merchant.toString();
    if (merchantId === userId) return true;
  }
  if (user.role === 'staff') {
    const driverId = booking.pickupDriver?._id?.toString() || booking.pickupDriver?.toString();
    const techId = booking.technician?._id?.toString() || booking.technician?.toString();
    const washId =
      booking.carWash?.staffAssigned?._id?.toString() ||
      booking.carWash?.staffAssigned?.toString();
    if (driverId === userId || techId === userId || washId === userId) return true;
  }
  return false;
};
