import Vehicle from '../models/Vehicle.js';
import Booking from '../models/Booking.js';

export const getAllDocuments = async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user._id };

    // 1. Fetch Vehicle Documents
    const vehicles = await Vehicle.find({ ...query, 'documents.0': { $exists: true } })
      .populate('user', 'name');

    const vehicleDocs = vehicles.flatMap(vehicle => 
      vehicle.documents.map(doc => ({
        _id: doc._id,
        name: doc.name || `${doc.type} - ${vehicle.licensePlate}`,
        type: doc.type,
        entityType: 'Vehicle',
        entityId: vehicle._id,
        vehicleId: vehicle._id, // Added vehicleId for consistency
        entityName: `${vehicle.make} ${vehicle.model} (${vehicle.licensePlate})`,
        owner: vehicle.user?.name || 'Unknown',
        date: doc.uploadedAt,
        expiryDate: doc.expiryDate,
        url: doc.url,
        isInvoice: false
      }))
    );

    // 2. Fetch Booking Invoices (Completed bookings)
    const bookings = await Booking.find({ ...query, status: { $in: ['Completed', 'Delivered'] } })
      .populate('user', 'name')
      .populate('vehicle', 'make model licensePlate');

    const invoiceDocs = bookings.map(booking => ({
      _id: booking._id,
      name: `Invoice #${booking._id.toString().slice(-6).toUpperCase()}`,
      type: 'Invoice',
      entityType: 'Booking',
      entityId: booking._id,
      vehicleId: booking.vehicle?._id, // Added vehicleId for filtering
      entityName: booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model}` : 'Unknown Vehicle',
      owner: booking.user?.name || 'Unknown',
      date: booking.updatedAt,
      expiryDate: null,
      url: `/api/bookings/${booking._id}/invoice`,
      isInvoice: true
    }));

    // Merge and Sort
    const allDocs = [...vehicleDocs, ...invoiceDocs].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    res.json(allDocs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
