import PDFDocument from 'pdfkit';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Service from '../models/Service.js';
import path from 'path';
import fs from 'fs';

// Helper function to check if booking is for general service
const isGeneralServiceBooking = async (booking) => {
  try {
    const services = await Service.find({ _id: { $in: booking.services } });
    return services.some(service => 
      service.category === 'Periodic' ||
      service.category === 'Services' ||
      service.name.toLowerCase().includes('general service')
    );
  } catch (error) {
    return false;
  }
};

// @desc    Get booking invoice PDF
// @route   GET /api/bookings/:id/invoice
// @access  Private
export const getBookingInvoice = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user', 'name email phone')
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

    // Check if this is a general service booking - if yes, don't generate invoice
    const isGeneralService = await isGeneralServiceBooking(booking);
    if (isGeneralService) {
      return res.status(400).json({ message: 'Invoice not available for general service bookings' });
    }

    // If there is an uploaded file, redirect to it
    if (booking.billing && booking.billing.fileUrl) {
      return res.redirect(booking.billing.fileUrl);
    }

    // Get payment details
    const payment = await Payment.findOne({ bookingId: booking._id, status: 'paid' });

    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=carzzi-invoice-${booking._id}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Header - Logo on left, Carzzi in middle
    const logoPath = path.join(process.cwd(), 'assets', 'footer.png');
    let startY = 50;
    
    // Draw logo on left
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, startY, { width: 60, height: 60 });
    }

    // Draw Carzzi in the middle (prominent)
    doc.fontSize(24).font('Helvetica-Bold').fillColor('#000');
    doc.text('Carzzi', doc.page.width / 2 - 40, startY + 20);
    doc.font('Helvetica');
    
    startY += 80;

    // Company Info (Left)
    doc.fontSize(11).fillColor('#000');
    doc.text('Company:', 50, startY);
    doc.text('Carzzi', 150, startY);
    startY += 20;
    doc.text('Address:', 50, startY);
    doc.text('Auto Services Platform', 150, startY);
    startY += 20;
    doc.text('PostCode / City:', 50, startY);
    doc.text('India', 150, startY);
    startY += 20;
    doc.text('Location:', 50, startY);
    doc.text('India', 150, startY);
    startY += 20;
    doc.text('Sender Name:', 50, startY);
    doc.text('Carzzi Team', 150, startY);

    // Invoice Info (Right)
    const rightX = 350;
    let rightY = startY - 100 + 50; // Start right section at same height as company info
    doc.text('Telephone / E-mail:', rightX, rightY);
    doc.text('support@carzzi.com', rightX + 130, rightY);
    rightY += 20;
    doc.text('Shipping Date:', rightX, rightY);
    doc.text(new Date().toLocaleDateString('en-IN'), rightX + 130, rightY);
    rightY += 20;
    doc.text('Shipping Number:', rightX, rightY);
    doc.text(booking.orderNumber || '', rightX + 130, rightY);
    rightY += 20;
    doc.text('Sender VAT Number:', rightX, rightY);
    doc.text('N/A', rightX + 130, rightY);

    // Horizontal line
    doc.moveTo(50, startY + 30).lineTo(550, startY + 30).stroke('#333');
    
    let yPosition = startY + 50;

    // Send To (Left) and Invoice Details (Right)
    doc.fontSize(11);
    doc.font('Helvetica-Bold').text('Send To', 50, yPosition).font('Helvetica');
    doc.font('Helvetica-Bold').text('Invoice Number', 350, yPosition).font('Helvetica');
    doc.text(booking.orderNumber || booking._id.toString().slice(-8).toUpperCase(), 480, yPosition);
    yPosition += 20;
    
    doc.text('Receiver Name:', 50, yPosition);
    doc.text(booking.user.name, 150, yPosition);
    doc.font('Helvetica-Bold').text('Date', 350, yPosition).font('Helvetica');
    doc.text(new Date().toLocaleDateString('en-IN'), 480, yPosition);
    yPosition += 20;
    
    doc.text('Address:', 50, yPosition);
    if (booking.location && booking.location.address) {
      doc.text(booking.location.address, 150, yPosition, { width: 180 });
    }
    doc.font('Helvetica-Bold').text('Order Number', 350, yPosition).font('Helvetica');
    doc.text(booking.orderNumber || '', 480, yPosition);
    yPosition += 20;
    
    doc.text('Location', 50, yPosition);
    doc.text('India', 150, yPosition);
    doc.font('Helvetica-Bold').text('Country of Origin', 350, yPosition).font('Helvetica');
    doc.text('India', 480, yPosition);
    yPosition += 20;
    
    doc.text('PostCode / Cite:', 50, yPosition);
    doc.text('N/A', 150, yPosition);
    doc.font('Helvetica-Bold').text('Country of destination', 350, yPosition).font('Helvetica');
    doc.text('India', 480, yPosition);
    yPosition += 20;
    
    doc.text('Telephone / E-mail:', 50, yPosition);
    doc.text(booking.user.phone || booking.user.email || 'N/A', 150, yPosition);
    doc.font('Helvetica-Bold').text('Terms of Payment', 350, yPosition).font('Helvetica');
    doc.text(payment ? 'Paid' : 'Pending', 480, yPosition);
    yPosition += 20;
    
    doc.text('Receiver VAT Number:', 50, yPosition);
    doc.text('N/A', 150, yPosition);
    doc.font('Helvetica-Bold').text('Bill of Lading', 350, yPosition).font('Helvetica');
    doc.text('N/A', 480, yPosition);
    yPosition += 30;

    // Horizontal line
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke('#333');
    yPosition += 20;

    // Table Header
    doc.fontSize(11).fillColor('#000');
    const tableX = 50;
    const colWidths = [250, 80, 100, 100];
    
    // Draw header background
    doc.save();
    doc.rect(tableX, yPosition - 15, 500, 25).fill('#f0f0f0');
    doc.restore();
    // Draw border
    doc.rect(tableX, yPosition - 15, 500, 25).stroke();
    
    doc.font('Helvetica-Bold');
    doc.text('Description', tableX + 5, yPosition - 8);
    doc.text('Quantity', tableX + colWidths[0] + 5, yPosition - 8);
    doc.text('Unit price', tableX + colWidths[0] + colWidths[1] + 5, yPosition - 8);
    doc.text('Amount', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition - 8);
    doc.font('Helvetica');
    yPosition += 20;

    let subtotal = 0;

    // Add services to table
    booking.services.forEach(service => {
      doc.text(service.name, tableX + 5, yPosition, { width: colWidths[0] - 10 });
      doc.text('1', tableX + colWidths[0] + 5, yPosition);
      doc.text(`₹${service.price}`, tableX + colWidths[0] + colWidths[1] + 5, yPosition);
      doc.text(`₹${service.price}`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition);
      subtotal += service.price;
      yPosition += 20;
    });

    // Add parts to table
    if (booking.parts && booking.parts.length > 0) {
      booking.parts.forEach(part => {
        const partName = part.name || (part.product ? part.product.name : 'Unknown Part');
        const partAmount = part.price * part.quantity;
        doc.text(partName, tableX + 5, yPosition, { width: colWidths[0] - 10 });
        doc.text(`${part.quantity}`, tableX + colWidths[0] + 5, yPosition);
        doc.text(`₹${part.price}`, tableX + colWidths[0] + colWidths[1] + 5, yPosition);
        doc.text(`₹${partAmount}`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition);
        subtotal += partAmount;
        yPosition += 20;
      });
    }

    // Table border
    doc.moveTo(tableX, yPosition).lineTo(tableX + 500, yPosition).stroke('#333');
    yPosition += 20;

    // Totals
    const discount = booking.discountAmount || 0;
    const tax = booking.billing && booking.billing.gst ? booking.billing.gst : 0;
    const total = booking.finalAmount || booking.totalAmount;

    doc.text('Subtotal', tableX + colWidths[0] + colWidths[1] + 5, yPosition);
    doc.text(`₹${subtotal}`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition);
    yPosition += 20;

    if (discount > 0) {
      doc.text(`Discount (${Math.round((discount / subtotal) * 100)}%)`, tableX + colWidths[0] + colWidths[1] + 5, yPosition);
      doc.text(`-₹${discount}`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition);
      yPosition += 20;
    }

    if (tax > 0) {
      doc.text('Tax 1', tableX + colWidths[0] + colWidths[1] + 5, yPosition);
      doc.text(`₹${tax}`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition);
      yPosition += 20;
    }

    // Final total line
    doc.moveTo(tableX + 300, yPosition).lineTo(tableX + 500, yPosition).stroke('#333');
    yPosition += 10;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total', tableX + colWidths[0] + colWidths[1] + 5, yPosition);
    doc.text(`₹${total}`, tableX + colWidths[0] + colWidths[1] + colWidths[2] + 5, yPosition);
    doc.font('Helvetica');

    doc.end();

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate and save invoice for a booking
// @access  Private (internal use)
export const generateAndSaveInvoice = async (booking) => {
  try {
    // For now, we'll just ensure the invoice is generated on demand
    // In a real system, we might save the PDF to S3 or similar
    return { success: true, message: 'Invoice will be generated on demand' };
  } catch (error) {
    console.error('Error generating invoice:', error);
    return { success: false, message: error.message };
  }
};
