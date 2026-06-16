import PDFDocument from 'pdfkit';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import Service from '../models/Service.js';
import Vehicle from '../models/Vehicle.js';
import { getVehicleDataFromS3 } from '../utils/s3Storage.js';
import path from 'path';
import fs from 'fs';
import { PassThrough } from 'stream';
import { finished } from 'node:stream/promises';
import crypto from 'crypto';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import { calculateOrderTotals, CHECKOUT_GST_RATE } from '../utils/orderPricing.js';

const COLORS = {
  headerBg: '#0f172a',
  headerText: '#f8fafc',
  headerMuted: '#94a3b8',
  border: '#cbd5e1',
  rowAlt: '#f8fafc',
  /** Line-items table header only (contrasts with order-summary card). */
  tableHeaderBg: '#334155',
  tableHeaderText: '#f8fafc',
  text: '#0f172a',
  muted: '#64748b',
  accent: '#0284c7',
};

const MARGIN = 48;
const HEADER_H = 92;
const LOGO_MAX_W = 150;
const LOGO_MAX_H = 54;

/** PDF built-in fonts (Helvetica) do not support U+20B9 (₹); using Rs. avoids garbled superscript-like output. */
const formatInr = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'Rs. 0';
  const str = n.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(n) && Math.abs(n % 1) < 1e-9 ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `Rs. ${str}`;
};

const isGeneralServiceBooking = async (booking) => {
  try {
    if (!booking || !booking.services || !Array.isArray(booking.services)) {
      return false;
    }
    const isPopulated = booking.services.length > 0 && typeof booking.services[0] === 'object';
    if (isPopulated) {
      return booking.services.some(
        (service) =>
          service &&
          (service.category === 'Periodic' ||
            service.category === 'Services' ||
            (service.name && service.name.toLowerCase().includes('general service')))
      );
    } else {
      const services = await Service.find({ _id: { $in: booking.services } });
      return services.some(
        (service) =>
          service &&
          (service.category === 'Periodic' ||
            service.category === 'Services' ||
            (service.name && service.name.toLowerCase().includes('general service')))
      );
    }
  } catch {
    return false;
  }
};

/** Map stored category to customer-facing main service name (e.g. Car Wash). */
const getMainServiceLabel = (category) => {
  if (!category) return 'Service';
  const map = {
    Wash: 'Car Wash',
    'Car Wash': 'Car Wash',
    'Tyre & Battery': 'Tyre & Battery',
    Tyres: 'Tyres',
    Battery: 'Battery',
    Essentials: 'Essentials',
    Detailing: 'Detailing',
    Painting: 'Painting',
    Denting: 'Denting',
    Repair: 'Repair',
    AC: 'AC Service',
    Accessories: 'Accessories',
    Periodic: 'Periodic Service',
    Services: 'Service',
    Other: 'Service',
  };
  return map[category] || category;
};

/**
 * Full line for invoice table: "Car Wash — Exterior only (45 mins)"
 * (main category label + catalog service name as sub-line).
 */
const formatInvoiceServiceDescription = (service) => {
  const main = getMainServiceLabel(service.category);
  const sub = (service.name || '').trim();
  if (!sub) return main;
  if (sub.toLowerCase() === main.toLowerCase()) return main;
  return `${main} — ${sub}`;
};

const resolveLogoPath = () => {
  const cwd = process.cwd();
  const candidates = [
    path.join(cwd, 'assets', 'carzzilogo.png'),
    path.join(cwd, 'assets', 'footer.png'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
};

const truncId = (s, maxLen = 26) => {
  if (s == null || s === '') return '—';
  const t = String(s);
  return t.length <= maxLen ? t : `${t.slice(0, maxLen)}…`;
};

/** Muted label above value — same style as FROM / BILL TO contact blocks. */
const drawInvoiceLabeledField = (doc, baseX, startY, label, text, colWidth) => {
  let pos = startY;
  doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8);
  doc.text(label, baseX, pos);
  pos += 9;
  doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
  const body = String(text);
  doc.text(body, baseX, pos, { width: colWidth });
  pos += doc.heightOfString(body, { width: colWidth }) + 8;
  return pos;
};

/** Circular PAID stamp at explicit center (cx, cy). */
const drawCircularPaidStampAt = (doc, cx, cy, r = 32) => {
  doc.save();
  doc.lineWidth(2.2);
  doc.strokeColor('#b91c1c');
  doc.circle(cx, cy, r).stroke();
  doc.lineWidth(1.05);
  doc.strokeColor('#fca5a5');
  doc.circle(cx, cy, r - 3.5).stroke();
  doc.fillColor('#991b1b').font('Helvetica-Bold').fontSize(10);
  doc.text('PAID', cx - r, cy - 5, { width: r * 2, align: 'center' });
  doc.restore();
};

const renderPdfToBuffer = async (doc) => {
  const chunks = [];
  const stream = new PassThrough();
  stream.on('data', (c) => chunks.push(c));
  doc.pipe(stream);
  doc.end();
  await finished(stream);
  return Buffer.concat(chunks);
};

const getInvoiceOwnerPassword = () => {
  if (process.env.PDF_INVOICE_OWNER_PASSWORD) {
    return process.env.PDF_INVOICE_OWNER_PASSWORD;
  }
  const seed = process.env.JWT_SECRET || process.env.MONGO_URI || 'carzzi-invoice-owner-dev';
  return crypto.createHash('sha256').update(`invoice-owner:${seed}`).digest('hex').slice(0, 32);
};

const sealPdfBuffer = async (pdfBuffer) => {
  try {
    const ownerPassword = getInvoiceOwnerPassword();
    const encryptPromise = encryptPDF(new Uint8Array(pdfBuffer), '', {
      ownerPassword,
      algorithm: 'AES-256',
      allowPrinting: true,
      allowHighQualityPrint: true,
      allowCopying: false,
      allowModifying: false,
      allowAnnotating: false,
      allowFillingForms: false,
      allowExtraction: false,
      allowAssembly: false,
    });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('PDF encryption timed out')), 2000)
    );
    const encrypted = await Promise.race([encryptPromise, timeoutPromise]);
    return Buffer.from(encrypted);
  } catch (err) {
    console.warn('Invoice PDF encryption failed, sending unencrypted PDF:', err.message);
    return pdfBuffer;
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
      .populate('services')
      .populate('parts.product', 'name');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const isOwner = booking.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isAssignedMerchant =
      req.user.role === 'merchant' &&
      booking.merchant &&
      booking.merchant.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isAssignedMerchant) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    const isGeneralService = await isGeneralServiceBooking(booking);
    if (isGeneralService) {
      return res.status(400).json({ message: 'Invoice not available for general service bookings' });
    }

    if (booking.billing && booking.billing.fileUrl) {
      return res.redirect(booking.billing.fileUrl);
    }

    const payment = await Payment.findOne({ bookingId: booking._id, status: 'paid' });

    const pageWidth = 612;
    const contentRight = pageWidth - MARGIN;
    const contentW = contentRight - MARGIN;

    const doc = new PDFDocument({
      size: 'LETTER',
      margin: MARGIN,
      info: {
        Title: `Invoice ${booking.orderNumber || ''}`,
        Author: 'HYPER MOBILITY SERVICES',
        Subject: 'Tax Invoice',
      },
    });

    const invoiceDate =
      booking.billing?.invoiceDate ||
      (payment?.updatedAt ? new Date(payment.updatedAt) : null) ||
      new Date();
    const invoiceDateStr = invoiceDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const orderLabel = String(booking.orderNumber ?? booking._id.toString().slice(-8).toUpperCase());

    // ----- Header band -----
    doc.save();
    doc.rect(0, 0, pageWidth, HEADER_H).fill(COLORS.headerBg);
    doc.restore();

    const logoPath = resolveLogoPath();
    if (logoPath) {
      doc.image(logoPath, MARGIN, 20, { fit: [LOGO_MAX_W, LOGO_MAX_H] });
    }

    doc.fillColor(COLORS.headerMuted).font('Helvetica-Bold').fontSize(10);
    doc.text('TAX INVOICE', contentRight - 200, 28, { width: 200, align: 'right' });
    doc.fillColor(COLORS.headerText).font('Helvetica-Bold').fontSize(22);
    doc.text(`#${orderLabel}`, contentRight - 200, 44, { width: 200, align: 'right' });
    doc.fillColor(COLORS.headerMuted).font('Helvetica').fontSize(9);
    doc.text(`Date  ${invoiceDateStr}`, contentRight - 200, 72, { width: 200, align: 'right' });

    let y = HEADER_H + 18;

    // ----- Parties & details (professional — rules + columns, no boxed cards) -----
    const colGap = 28;
    const colW = (contentW - colGap) / 2;
    const leftX = MARGIN;
    const rightX = MARGIN + colW + colGap;

    const drawHairline = (yy) => {
      doc.save();
      doc.strokeColor('#e2e8f0').lineWidth(0.75);
      doc.moveTo(MARGIN, yy).lineTo(MARGIN + contentW, yy).stroke();
      doc.restore();
    };

    drawHairline(y);
    y += 12;

    let yL = y;
    let yR = y;

    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7.5);
    doc.text('FROM', leftX, yL);
    doc.text('BILL TO', rightX, yR);
    yL += 11;
    yR += 11;

    const sellerEmail = process.env.INVOICE_SELLER_EMAIL || 'support@carzzi.com';
    const sellerPhone = process.env.INVOICE_SELLER_PHONE || '+91 9849964945';
    const sellerAddress =
      process.env.INVOICE_SELLER_ADDRESS ||
      'Plot no 71 & 72, 3rd Floor, Phase IV, IDA Cherlapally, Hyderabad- 500051, India';

    doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(11);
    doc.text('HYPER MOBILITY SERVICES', leftX, yL, { width: colW });
    doc.text(booking.user.name || 'Customer', rightX, yR, { width: colW });
    yL += 14;
    yR += 14;

    const top = yL;

    yL = top;
    yL = drawInvoiceLabeledField(doc, leftX, yL, 'Email', sellerEmail, colW);
    yL = drawInvoiceLabeledField(doc, leftX, yL, 'Phone number', sellerPhone, colW);
    yL = drawInvoiceLabeledField(doc, leftX, yL, 'GST Registration No', '36AATFH3060Q1ZO', colW);
    yL = drawInvoiceLabeledField(doc, leftX, yL, 'Address', sellerAddress, colW);

    const custEmail = booking.user?.email || '—';
    const custPhone = booking.user?.phone || '—';
    const custAddr =
      booking.location && booking.location.address ? booking.location.address : 'N/A';

    yR = top;
    yR = drawInvoiceLabeledField(doc, rightX, yR, 'Email', custEmail, colW);
    yR = drawInvoiceLabeledField(doc, rightX, yR, 'Phone number', custPhone, colW);
    yR = drawInvoiceLabeledField(doc, rightX, yR, 'Address', custAddr, colW);

    y = Math.max(yL, yR) + 22;
    drawHairline(y);
    y += 14;

    // ----- Vehicle & payment (two columns, same style) -----
    yL = y;
    yR = y;

    doc.fillColor(COLORS.muted).font('Helvetica-Bold').fontSize(7.5);
    doc.text('VEHICLE', leftX, yL);
    doc.text('PAYMENT DETAILS', rightX, yR);
    yL += 11;
    yR += 11;

    doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
    const v = booking.vehicle;
    if (v && typeof v === 'object' && (v.licensePlate || v.make)) {
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(v.licensePlate || '—', leftX, yL, { width: colW });
      yL += 14;
      doc.font('Helvetica').fontSize(9);
      const mm = [v.make, v.model].filter(Boolean).join(' ');
      const variantLine = [mm, v.variant].filter(Boolean).join(' · ') || '—';
      doc.text(variantLine, leftX, yL, { width: colW });
      yL += doc.heightOfString(variantLine, { width: colW }) + 4;
      yL = drawInvoiceLabeledField(
        doc,
        leftX,
        yL,
        'Year',
        v.year != null ? String(v.year) : '—',
        colW
      );
      yL = drawInvoiceLabeledField(doc, leftX, yL, 'Color', v.color || '—', colW);
      yL = drawInvoiceLabeledField(doc, leftX, yL, 'Fuel', v.fuelType || '—', colW);
      if (v.vin) {
        doc.text(`VIN  ${truncId(v.vin, 22)}`, leftX, yL, { width: colW });
        yL += doc.heightOfString(`VIN  ${truncId(v.vin, 22)}`, { width: colW }) + 4;
      }
    } else {
      doc.text('No vehicle linked to this booking.', leftX, yL, { width: colW });
      yL += 16;
    }

    let py = yR;

    if (payment) {
      py = drawInvoiceLabeledField(doc, rightX, py, 'Amount paid', formatInr(payment.amount), colW);
      py = drawInvoiceLabeledField(doc, rightX, py, 'Order ref', payment.orderId || '—', colW);
      const payRef = payment.cashfreePaymentId || payment.paymentId || payment.transactionId;
      py = drawInvoiceLabeledField(doc, rightX, py, 'Payment ref', payRef || '—', colW);
      const paidAt = payment.updatedAt || payment.createdAt;
      py = drawInvoiceLabeledField(
        doc,
        rightX,
        py,
        'Paid on',
        paidAt
          ? new Date(paidAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
          : '—',
        colW
      );
    } else {
      doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
      doc.text('No payment record linked to this booking.', rightX, py, { width: colW });
      py += 16;
    }

    y = Math.max(yL, py) + 20;
    drawHairline(y);
    y += 16;

    // ----- Line items section -----
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8);
    doc.text('Billed on this invoice', MARGIN, y);
    y += 12;
    doc.fillColor(COLORS.accent).font('Helvetica-Bold').fontSize(11);
    doc.text('SERVICES & PARTS', MARGIN, y);
    y += 18;

    const tableX = MARGIN;
    const colDesc = 268;
    const colQty = 48;
    const colUnit = 92;
    const colAmt = contentW - colDesc - colQty - colUnit;

    const drawTableHeader = () => {
      doc.save();
      doc.rect(tableX, y, contentW, 22).fill(COLORS.tableHeaderBg);
      doc.rect(tableX, y, contentW, 22).stroke(COLORS.tableHeaderBg);
      doc.restore();
      doc.fillColor(COLORS.tableHeaderText).font('Helvetica-Bold').fontSize(9);
      doc.text('Description', tableX + 8, y + 6, { width: colDesc - 12 });
      doc.text('Qty', tableX + colDesc, y + 6, { width: colQty, align: 'center' });
      doc.text('Unit', tableX + colDesc + colQty, y + 6, { width: colUnit, align: 'right' });
      doc.text('Amount', tableX + colDesc + colQty + colUnit, y + 6, { width: colAmt - 8, align: 'right' });
      return y + 22;
    };

    y = drawTableHeader();
    doc.font('Helvetica').fontSize(9);

    let subtotal = 0;
    let rowIdx = 0;

    const drawRow = (description, qty, unitPrice, lineAmount) => {
      const h = Math.max(26, doc.heightOfString(description, { width: colDesc - 12 }) + 14);
      if (y + h > 720) {
        doc.addPage();
        y = MARGIN;
        y = drawTableHeader();
        doc.font('Helvetica').fontSize(9);
      }
      if (rowIdx % 2 === 0) {
        doc.save();
        doc.rect(tableX, y, contentW, h).fill('#ffffff');
        doc.restore();
      } else {
        doc.save();
        doc.rect(tableX, y, contentW, h).fill(COLORS.rowAlt);
        doc.restore();
      }
      doc.rect(tableX, y, contentW, h).stroke(COLORS.border);
      doc.fillColor(COLORS.text);
      doc.text(description, tableX + 8, y + 7, { width: colDesc - 12 });
      doc.text(String(qty), tableX + colDesc, y + 7, { width: colQty, align: 'center' });
      doc.text(formatInr(unitPrice), tableX + colDesc + colQty, y + 7, { width: colUnit - 4, align: 'right' });
      doc.font('Helvetica-Bold').text(
        formatInr(lineAmount),
        tableX + colDesc + colQty + colUnit,
        y + 7,
        { width: colAmt - 8, align: 'right' }
      );
      doc.font('Helvetica');
      y += h;
      rowIdx += 1;
    };

    // Fetch vehicle reference data for dynamic pricing
    let refMatch = null;
    try {
      const v = booking.vehicle;
      if (v && typeof v === 'object' && v.make && v.model) {
        const s3Promise = getVehicleDataFromS3();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('S3 fetch timed out')), 2500)
        );
        const allRefData = await Promise.race([s3Promise, timeoutPromise]);
        const cleanBrand = v.make.trim().toLowerCase();
        const cleanModel = v.model.trim().toLowerCase();
        const cleanVariant = v.variant ? v.variant.trim().toLowerCase() : '';

        refMatch = allRefData.find(item => 
          item.brand_name.toLowerCase() === cleanBrand && 
          item.model.toLowerCase() === cleanModel && 
          (cleanVariant === '' || item.brand_model.toLowerCase() === cleanVariant)
        );
      }
    } catch (err) {
      console.error('Error fetching reference data for invoice:', err);
    }

    (booking.services || []).forEach((service) => {
      const desc = formatInvoiceServiceDescription(service);
      let price = Number(service.price) || 0;
      
      const isWash = service.category === 'Car Wash' || service.category === 'Wash';
      const isGeneral =
        service.category === 'Periodic' ||
        service.category === 'Services' ||
        (service.name && String(service.name).toLowerCase().includes('general service'));

      if (isGeneral && refMatch?.general_service_price) {
        const generalPrice = Number(refMatch.general_service_price);
        if (!isNaN(generalPrice) && generalPrice > 0) {
          price = generalPrice;
        }
      } else if (isWash && refMatch) {
        const sName = String(service.name || '').toLowerCase();
        let washPrice = null;
        if (sName.includes('exterior wash') && !sName.includes('interior')) {
          washPrice = refMatch.car_wash_exterior_price;
        } else if (sName.includes('interior + exterior') && !sName.includes('underbody')) {
          washPrice = refMatch.car_wash_interior_exterior_price;
        } else if (
          sName.includes('underbody') ||
          (sName.includes('interior') && sName.includes('exterior') && sName.includes('underbody'))
        ) {
          washPrice = refMatch.car_wash_interior_exterior_underbody_price;
        }
        if (!washPrice || washPrice === '') {
          washPrice = refMatch.car_wash_price;
        }
        const washNum = Number(washPrice);
        if (!isNaN(washNum) && washNum > 0) {
          price = washNum;
        }
      }

      drawRow(desc, 1, price, price);
      subtotal += price;
    });

    if (isGeneralService && booking.pickupDropPrice && booking.pickupDropPrice > 0) {
      drawRow('Pickup & Drop Charges', 1, booking.pickupDropPrice, booking.pickupDropPrice);
      subtotal += booking.pickupDropPrice;
    }

    if (booking.parts && booking.parts.length > 0) {
      booking.parts.forEach((part) => {
        const name =
          part.name ||
          (part.product && typeof part.product === 'object' && part.product.name
            ? part.product.name
            : 'Part');
        const qty = Number(part.quantity) || 1;
        const unit = Number(part.price) || 0;
        const lineAmount = unit * qty;
        drawRow(name, qty, unit, lineAmount);
        subtotal += lineAmount;
      });
    }

    doc.moveTo(tableX, y).lineTo(tableX + contentW, y).stroke(COLORS.border);
    y += 14;

    // ----- Totals + PAID stamp (single horizontal row) -----
    const summaryTop = y;
    const stampR = 32;
    const showPaidStamp = payment && payment.status === 'paid';
    const stampSlotW = showPaidStamp ? stampR * 2 + 20 : 0;
    const totalsPanelX = MARGIN + stampSlotW;
    const totalsPanelW = contentW - stampSlotW;
    const valueW = 88;

    let ty = summaryTop;
    const moneyRowTotals = (label, value, bold) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 10);
      doc.fillColor(COLORS.text);
      doc.text(value, totalsPanelX + totalsPanelW - valueW, ty, { width: valueW, align: 'right' });
      doc.text(label, totalsPanelX, ty, { width: totalsPanelW - valueW - 8, align: 'right' });
      ty += bold ? 22 : 18;
    };

    const discount = Number(booking.discountAmount) || 0;
    const merchantGst = Number(booking.billing?.gst) || 0;
    const checkoutGst = isGeneralService ? 0 : Number(booking.gstAmount) || 0;
    let tax = merchantGst > 0 ? merchantGst : checkoutGst;
    let total = Number(booking.finalAmount);
    if (!Number.isFinite(total)) {
      total = Number(booking.totalAmount);
    }
    if (!isGeneralService && tax <= 0 && discount >= 0 && subtotal > 0) {
      const computed = calculateOrderTotals(subtotal, discount, true);
      if (tax <= 0) tax = computed.tax;
      if (!Number.isFinite(total) || total <= 0) {
        total = computed.total;
      }
    } else if (isGeneralService && merchantGst <= 0) {
      tax = 0;
      if (!Number.isFinite(total) || total <= 0) {
        total = Math.round((subtotal - discount) * 100) / 100;
      }
    }
    if (!Number.isFinite(total) || total <= 0) {
      total = Math.round((subtotal - discount + tax) * 100) / 100;
    }

    moneyRowTotals('Subtotal', formatInr(subtotal), false);
    if (discount > 0) {
      const pct = subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0;
      moneyRowTotals(`Discount (${pct}%)`, `- ${formatInr(discount)}`, false);
    }
    if (tax > 0) {
      const taxLabel =
        merchantGst > 0
          ? 'Tax (GST)'
          : `Tax (GST ${Math.round(CHECKOUT_GST_RATE * 100)}%)`;
      moneyRowTotals(taxLabel, formatInr(tax), false);
    }
    ty += 4;
    doc.save();
    doc.moveTo(totalsPanelX + 40, ty).lineTo(MARGIN + contentW, ty).lineWidth(1).stroke(COLORS.accent);
    doc.restore();
    ty += 10;
    moneyRowTotals('Total payable', formatInr(total), true);

    const summaryBlockH = Math.max(86, ty - summaryTop + 8);
    if (showPaidStamp) {
      const cx = MARGIN + stampR + 10;
      const cy = summaryTop + summaryBlockH / 2;
      drawCircularPaidStampAt(doc, cx, cy, stampR);
    }

    y = summaryTop + summaryBlockH + 16;

    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8).text(
      'All amounts are in Indian Rupees (INR). ' +
        'This is a computer-generated invoice and is valid without signature.',
      MARGIN,
      y,
      { width: contentW, align: 'center' }
    );
    y += 22;
    doc.fillColor(COLORS.muted).fontSize(8).text('Thank you for choosing HYPER MOBILITY SERVICES.', MARGIN, y, {
      width: contentW,
      align: 'center',
    });

    const rawPdf = await renderPdfToBuffer(doc);
    const securedPdf = await sealPdfBuffer(rawPdf);

    const filename = 'invoice.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', securedPdf.length);
    res.setHeader('Cache-Control', 'no-store, private');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(securedPdf);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate and save invoice for a booking
// @access  Private (internal use)
export const generateAndSaveInvoice = async (booking) => {
  try {
    return { success: true, message: 'Invoice will be generated on demand' };
  } catch (error) {
    console.error('Error generating invoice:', error);
    return { success: false, message: error.message };
  }
};
