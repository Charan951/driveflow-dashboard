// Customer-facing booking/status email templates — content matches
// "Carzzi_Customer_Email_Templates.docx" (Booking & Vehicle Service Status
// Updates). Each template renders both a plain-text and branded HTML body.

const FOOTER_TEXT = 'Warm regards,\nTeam Carzzi\nYour Car. Our Responsibility.\nwww.carzzi.com';

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));

const formatInr = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

/** Renders the shared branded HTML shell around a status pill + field rows + message. */
const renderHtml = ({ statusLabel, greeting, intro, fields, message, extraMessage }) => {
  const rowsHtml = fields
    .filter((f) => f.value !== null && f.value !== undefined && f.value !== '')
    .map(
      (f) => `
        <tr>
          <td style="padding:6px 0;color:#64748b;font-size:13px;width:160px;">${escapeHtml(f.label)}</td>
          <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapeHtml(f.value)}</td>
        </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background-color:#0f172a;padding:24px 32px;">
                <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">CARZZI</span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;color:#0f172a;font-size:15px;">${escapeHtml(greeting)}</p>
                <p style="margin:0 0 20px;color:#334155;font-size:14px;line-height:1.5;">${escapeHtml(intro)}</p>
                <div style="display:inline-block;background-color:#eff6ff;color:#2563eb;font-size:12px;font-weight:700;letter-spacing:0.5px;padding:6px 14px;border-radius:999px;margin-bottom:20px;">
                  BOOKING STATUS: ${escapeHtml(statusLabel)}
                </div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:8px 0;margin-bottom:20px;">
                  ${rowsHtml}
                </table>
                <p style="margin:0 0 8px;color:#334155;font-size:14px;line-height:1.5;">${escapeHtml(message)}</p>
                ${extraMessage ? `<p style="margin:0 0 8px;color:#334155;font-size:14px;line-height:1.5;">${escapeHtml(extraMessage)}</p>` : ''}
                <p style="margin:24px 0 0;color:#0f172a;font-size:14px;">
                  Warm regards,<br/>
                  <strong>Team Carzzi</strong><br/>
                  <span style="color:#64748b;">Your Car. Our Responsibility.</span><br/>
                  <a href="https://www.carzzi.com" style="color:#2563eb;text-decoration:none;">www.carzzi.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const renderText = ({ statusLabel, greeting, intro, fields, message, extraMessage }) => {
  const fieldLines = fields
    .filter((f) => f.value !== null && f.value !== undefined && f.value !== '')
    .map((f) => `${f.label}: ${f.value}`)
    .join('\n');
  return [
    greeting,
    '',
    intro,
    '',
    `Booking Status: ${statusLabel}`,
    '',
    fieldLines,
    '',
    message,
    extraMessage || '',
    '',
    FOOTER_TEXT,
  ]
    .filter((line) => line !== '')
    .join('\n');
};

/**
 * Build a {subject, text, html} email for a booking status/lifecycle event.
 *
 * @param {string} key One of: BOOKING_CONFIRMED, VEHICLE_PICKED_UP,
 *   SERVICE_STARTED, ESTIMATE_APPROVAL_REQUIRED, ESTIMATE_APPROVED,
 *   SERVICE_COMPLETED, PAYMENT_PENDING, PAYMENT_RECEIVED,
 *   OUT_FOR_DELIVERY, DELIVERED, BOOKING_CANCELLED
 * @param {object} data Booking/customer fields used to fill the template.
 */
export const getBookingStatusEmail = (key, data = {}) => {
  const customerName = data.customerName || 'Customer';
  const bookingId = data.bookingId || data.orderNumber || '—';
  const service = data.service || null;
  const dateTime = data.dateTime || null;
  const vehicle = data.vehicle || null;
  const vehicleNumber = data.vehicleNumber || null;
  const amount = formatInr(data.amount);
  const referenceNumber = data.referenceNumber || null;
  const greeting = `Dear ${customerName},`;

  const templates = {
    BOOKING_CONFIRMED: {
      subject: 'Your Carzzi Booking Has Been Confirmed',
      statusLabel: 'CONFIRMED',
      intro: 'Your Carzzi booking has been confirmed.',
      fields: [
        { label: 'Booking ID', value: bookingId },
        { label: 'Service', value: service },
        { label: 'Scheduled Date & Time', value: dateTime },
      ],
      message: 'You can check your dashboard for complete booking details and status updates.',
      extraMessage: 'Thank you for choosing Carzzi.',
    },
    VEHICLE_PICKED_UP: {
      subject: 'Your Vehicle Has Been Picked Up | Carzzi',
      statusLabel: 'VEHICLE PICKED UP',
      intro: 'Your vehicle has been successfully picked up by our Carzzi executive.',
      fields: [
        { label: 'Booking ID', value: bookingId },
        { label: 'Vehicle', value: vehicle },
        { label: 'Vehicle Number', value: vehicleNumber },
      ],
      message: 'You can track the latest status from your dashboard.',
      extraMessage: 'Thank you for choosing Carzzi.',
    },
    SERVICE_STARTED: {
      subject: 'Service Has Started for Your Vehicle | Carzzi',
      statusLabel: 'SERVICE IN PROGRESS',
      intro: 'The service for your vehicle has started.',
      fields: [
        { label: 'Booking ID', value: bookingId },
        { label: 'Service', value: service },
        { label: 'Vehicle Number', value: vehicleNumber },
      ],
      message: 'We will keep you updated as your vehicle moves through the service process.',
      extraMessage: 'You can check your dashboard for the latest updates.',
    },
    ESTIMATE_APPROVAL_REQUIRED: {
      subject: 'Action Required: Approve Your Service Estimate | Carzzi',
      statusLabel: 'ESTIMATE APPROVAL REQUIRED',
      intro: 'The service estimate for your vehicle is ready for your review.',
      fields: [
        { label: 'Booking ID', value: bookingId },
        { label: 'Vehicle Number', value: vehicleNumber },
        { label: 'Estimated Amount', value: amount != null ? `₹${amount}` : null },
      ],
      message: 'Please review the estimate in your dashboard and approve it to proceed with the required work.',
      extraMessage: 'No additional work will be carried out without your approval.',
    },
    ESTIMATE_APPROVED: {
      subject: 'Your Service Estimate Has Been Approved | Carzzi',
      statusLabel: 'ESTIMATE APPROVED',
      intro: 'Your service estimate has been successfully approved.',
      fields: [
        { label: 'Booking ID', value: bookingId },
        { label: 'Vehicle Number', value: vehicleNumber },
        { label: 'Approved Amount', value: amount != null ? `₹${amount}` : null },
      ],
      message: 'The service team will proceed with the approved work. You can check your dashboard for further status updates.',
    },
    SERVICE_COMPLETED: {
      subject: 'Your Vehicle Service Is Complete | Carzzi',
      statusLabel: 'SERVICE COMPLETED',
      intro: 'The service for your vehicle has been completed.',
      fields: [
        { label: 'Booking ID', value: bookingId },
        { label: 'Vehicle Number', value: vehicleNumber },
        { label: 'Service', value: service },
      ],
      message: 'Please check your dashboard for service details and the next steps.',
      extraMessage: 'Thank you for choosing Carzzi.',
    },
    PAYMENT_PENDING: {
      subject: 'Payment Pending for Your Carzzi Booking',
      statusLabel: 'PAYMENT PENDING',
      intro: 'Your vehicle service has been completed and payment is pending.',
      fields: [
        { label: 'Booking ID', value: bookingId },
        { label: 'Vehicle Number', value: vehicleNumber },
        { label: 'Amount Payable', value: amount != null ? `₹${amount}` : null },
      ],
      message: 'Please complete the payment through your Carzzi dashboard. Vehicle release/delivery will be processed after successful payment confirmation.',
    },
    PAYMENT_RECEIVED: {
      subject: 'Payment Received | Carzzi',
      statusLabel: 'PAYMENT COMPLETED',
      intro: 'We have successfully received your payment.',
      fields: [
        { label: 'Booking ID', value: bookingId },
        { label: 'Vehicle Number', value: vehicleNumber },
        { label: 'Amount Paid', value: amount != null ? `₹${amount}` : null },
        { label: 'Payment Reference Number', value: referenceNumber },
      ],
      message: 'Thank you for your payment. We will proceed with the vehicle release/delivery process.',
    },
    OUT_FOR_DELIVERY: {
      subject: 'Your Vehicle Is Out for Delivery | Carzzi',
      statusLabel: 'OUT FOR DELIVERY',
      intro: 'Your vehicle is now out for delivery.',
      fields: [
        { label: 'Booking ID', value: bookingId },
        { label: 'Vehicle Number', value: vehicleNumber },
      ],
      message: 'Our executive will deliver your vehicle to the registered delivery location.',
      extraMessage: 'You can check your dashboard for the latest status.',
    },
    DELIVERED: {
      subject: 'Your Vehicle Has Been Delivered | Carzzi',
      statusLabel: 'DELIVERED',
      intro: 'Your vehicle has been successfully delivered.',
      fields: [
        { label: 'Booking ID', value: bookingId },
        { label: 'Vehicle Number', value: vehicleNumber },
      ],
      message: 'We hope you had a smooth experience with Carzzi. Thank you for trusting us with your vehicle.',
      extraMessage: 'We look forward to serving you again.',
    },
    BOOKING_CANCELLED: {
      subject: 'Your Carzzi Booking Has Been Cancelled',
      statusLabel: 'CANCELLED',
      intro: 'Your Carzzi booking has been cancelled.',
      fields: [
        { label: 'Booking ID', value: bookingId },
        { label: 'Service', value: service },
      ],
      message: 'You can check your dashboard for complete booking details and status updates. If you have any questions or need assistance, please contact our support team.',
      extraMessage: 'Thank you for choosing Carzzi.',
    },
  };

  const tmpl = templates[key];
  if (!tmpl) return null;

  const renderData = { ...tmpl, greeting };
  return {
    subject: tmpl.subject,
    text: renderText(renderData),
    html: renderHtml(renderData),
  };
};

/** Maps a Booking's canonical status string to the matching email template key. */
export const BOOKING_STATUS_EMAIL_KEYS = {
  VEHICLE_PICKED: 'VEHICLE_PICKED_UP',
  PICKUP_BATTERY_TIRE: 'VEHICLE_PICKED_UP',
  SERVICE_STARTED: 'SERVICE_STARTED',
  CAR_WASH_STARTED: 'SERVICE_STARTED',
  INSTALLATION: 'SERVICE_STARTED',
  SERVICE_COMPLETED: 'SERVICE_COMPLETED',
  CAR_WASH_COMPLETED: 'SERVICE_COMPLETED',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  DELIVERY: 'DELIVERED',
  COMPLETED: 'DELIVERED',
  CANCELLED: 'BOOKING_CANCELLED',
};
