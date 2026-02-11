import PDFDocument from 'pdfkit';
import Booking from '../models/Booking.js';

// @desc    Get booking invoice PDF
// @route   GET /api/bookings/:id/invoice
// @access  Private
export const getBookingInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email')
      .populate('vehicle')
      .populate('services');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if user is authorized (admin, owner, or assigned merchant)
    const isOwner = booking.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssignedMerchant = req.user.role === 'merchant' && booking.merchant && booking.merchant.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isAssignedMerchant) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const doc = new PDFDocument();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${booking._id}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('DriveFlow Invoice', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Invoice ID: ${booking._id}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Customer Details
    doc.text(`Customer: ${booking.user.name}`);
    doc.text(`Email: ${booking.user.email}`);
    doc.moveDown();

    // Vehicle Details
    if (booking.vehicle) {
      doc.text(`Vehicle: ${booking.vehicle.make} ${booking.vehicle.model} (${booking.vehicle.licensePlate})`);
    }
    doc.moveDown();

    // Services
    doc.text('Services:', { underline: true });
    booking.services.forEach(service => {
      doc.text(`${service.name}: ₹${service.price}`);
    });
    doc.moveDown();

    // Parts
    if (booking.parts && booking.parts.length > 0) {
      doc.text('Parts:', { underline: true });
      booking.parts.forEach(part => {
        const partName = part.name || (part.product ? part.product.name : 'Unknown Part');
        doc.text(`${partName}: ₹${part.price} x ${part.quantity} = ₹${part.price * part.quantity}`);
      });
      doc.moveDown();
    }

    // Total
    doc.fontSize(14).text(`Total Amount: ₹${booking.totalAmount}`, { bold: true });

    doc.end();

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
