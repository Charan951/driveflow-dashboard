/**
 * Utility functions for notification handling
 */

interface NotificationData {
  type?: string;
  bookingId?: string;
  ticketId?: string;
  orderId?: string;
  status?: string;
  distance?: number;
  [key: string]: any;
}

/**
 * Get redirect URL based on notification data
 * @param data - Notification data object
 * @param userRole - Current user role
 * @returns Redirect URL or null if no redirect needed
 */
export const getNotificationRedirectUrl = (
  data?: NotificationData,
  userRole?: string
): string | null => {
  if (!data) return null;

  // Handle booking-related notifications
  if (data.bookingId) {
    switch (userRole) {
      case 'customer':
        return `/track/${data.bookingId}`;
      case 'admin':
        return `/admin/bookings/${data.bookingId}`;
      case 'merchant':
        return `/merchant/order/${data.bookingId}`;
      case 'staff':
        return `/staff/order/${data.bookingId}`;
      default:
        return `/track/${data.bookingId}`;
    }
  }

  // Handle ticket-related notifications
  if (data.ticketId) {
    switch (userRole) {
      case 'customer':
        return `/support`;
      case 'admin':
        return `/admin/support`;
      default:
        return `/support`;
    }
  }

  // Handle order-related notifications (for tire/battery services)
  if (data.orderId) {
    switch (userRole) {
      case 'customer':
        return `/tires-battery`;
      case 'admin':
        return `/admin/bookings`;
      case 'merchant':
        return `/merchant/orders`;
      default:
        return `/tires-battery`;
    }
  }

  // Handle notification type-based redirects
  switch (data.type) {
    case 'nearby':
    case 'status':
      if (data.bookingId) {
        return getNotificationRedirectUrl({ bookingId: data.bookingId }, userRole);
      }
      break;
    case 'otp':
      if (data.bookingId) {
        return getNotificationRedirectUrl({ bookingId: data.bookingId }, userRole);
      }
      break;
    case 'payment':
      switch (userRole) {
        case 'customer':
          return `/payments`;
        case 'admin':
          return `/admin/payments`;
        case 'merchant':
          return `/merchant/orders`;
        default:
          return `/payments`;
      }
    default:
      break;
  }

  return null;
};

/**
 * Check if notification should be clickable
 * @param data - Notification data object
 * @returns Boolean indicating if notification is clickable
 */
export const isNotificationClickable = (data?: NotificationData): boolean => {
  if (!data) return false;
  
  return !!(
    data.bookingId ||
    data.ticketId ||
    data.orderId ||
    ['nearby', 'status', 'otp', 'payment'].includes(data.type || '')
  );
};

/**
 * Get a description of what clicking the notification will do
 * @param data - Notification data object
 * @param userRole - Current user role
 * @returns Description string or null
 */
export const getNotificationClickDescription = (
  data?: NotificationData,
  userRole?: string
): string | null => {
  if (!data) return null;

  if (data.bookingId) {
    switch (userRole) {
      case 'customer':
        return 'View booking details and track progress';
      case 'admin':
        return 'View booking in admin panel';
      case 'merchant':
        return 'View order details';
      case 'staff':
        return 'View assigned order';
      default:
        return 'View booking details';
    }
  }

  if (data.ticketId) {
    return 'View support ticket';
  }

  if (data.orderId) {
    return 'View order details';
  }

  switch (data.type) {
    case 'nearby':
      return 'Track service location';
    case 'status':
      return 'View booking status';
    case 'otp':
      return 'View OTP details';
    case 'payment':
      return 'View payment details';
    default:
      return null;
  }
};