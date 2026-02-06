// Dummy Vehicles Data
export const vehicles = [
  {
    id: '1',
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    licensePlate: 'ABC 1234',
    color: 'Pearl White',
    image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=300&fit=crop',
    vin: '5YJ3E1EA1NF123456',
    mileage: 15420,
    fuelType: 'Electric',
    lastService: '2024-01-15',
    nextService: '2024-07-15',
  },
  {
    id: '2',
    make: 'BMW',
    model: 'X5',
    year: 2022,
    licensePlate: 'XYZ 5678',
    color: 'Mineral White',
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&h=300&fit=crop',
    vin: 'WBAJB0C51KB789012',
    mileage: 28300,
    fuelType: 'Petrol',
    lastService: '2024-02-20',
    nextService: '2024-08-20',
  },
  {
    id: '3',
    make: 'Mercedes',
    model: 'E-Class',
    year: 2024,
    licensePlate: 'MER 9012',
    color: 'Obsidian Black',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=400&h=300&fit=crop',
    vin: 'W1KZF8DB4NA345678',
    mileage: 5200,
    fuelType: 'Hybrid',
    lastService: '2024-03-10',
    nextService: '2024-09-10',
  },
];

// Dummy Orders/Bookings Data
export const orders = [
  {
    id: 'ORD-001',
    vehicleId: '1',
    vehicle: vehicles[0],
    service: 'Full Vehicle Service',
    status: 'in_transit',
    scheduledDate: '2024-03-20',
    scheduledTime: '10:00 AM',
    estimatedCompletion: '2024-03-21',
    price: 299,
    merchant: {
      id: 'm1',
      name: 'AutoCare Pro Center',
      rating: 4.8,
      address: '123 Service Lane, Downtown',
    },
    progress: [
      { step: 'Pickup Scheduled', completed: true, time: '9:00 AM' },
      { step: 'In Transit', completed: true, time: '9:45 AM' },
      { step: 'At Service Center', completed: false, time: '' },
      { step: 'Service Complete', completed: false, time: '' },
      { step: 'Delivered', completed: false, time: '' },
    ],
    location: { lat: 40.7128, lng: -74.006 },
  },
  {
    id: 'ORD-002',
    vehicleId: '2',
    vehicle: vehicles[1],
    service: 'Oil Change & Filter',
    status: 'completed',
    scheduledDate: '2024-03-15',
    scheduledTime: '2:00 PM',
    estimatedCompletion: '2024-03-15',
    price: 89,
    merchant: {
      id: 'm2',
      name: 'Quick Lube Express',
      rating: 4.5,
      address: '456 Motor Ave, Eastside',
    },
    progress: [
      { step: 'Pickup Scheduled', completed: true, time: '1:30 PM' },
      { step: 'In Transit', completed: true, time: '2:00 PM' },
      { step: 'At Service Center', completed: true, time: '2:15 PM' },
      { step: 'Service Complete', completed: true, time: '3:30 PM' },
      { step: 'Delivered', completed: true, time: '4:00 PM' },
    ],
    location: { lat: 40.7589, lng: -73.9851 },
  },
];

// Dummy Services Data
export const services = [
  {
    id: 's1',
    name: 'Full Vehicle Service',
    category: 'maintenance',
    description: 'Complete inspection and service including oil change, filter replacement, and 40-point check',
    price: 299,
    duration: '4-6 hours',
    icon: 'Wrench',
    popular: true,
  },
  {
    id: 's2',
    name: 'Oil Change',
    category: 'maintenance',
    description: 'Premium synthetic oil change with filter replacement',
    price: 89,
    duration: '1 hour',
    icon: 'Droplets',
    popular: true,
  },
  {
    id: 's3',
    name: 'Brake Service',
    category: 'maintenance',
    description: 'Brake pad replacement and rotor inspection',
    price: 199,
    duration: '2-3 hours',
    icon: 'Disc',
    popular: false,
  },
  {
    id: 's4',
    name: 'AC Service',
    category: 'maintenance',
    description: 'AC gas top-up and system check',
    price: 149,
    duration: '1-2 hours',
    icon: 'Snowflake',
    popular: true,
  },
  {
    id: 's5',
    name: 'Dent Repair',
    category: 'bodyshop',
    description: 'Paintless dent removal for minor dents',
    price: 129,
    duration: '1-2 hours',
    icon: 'Hammer',
    popular: false,
  },
  {
    id: 's6',
    name: 'Full Body Paint',
    category: 'bodyshop',
    description: 'Complete exterior repaint with premium finish',
    price: 2499,
    duration: '5-7 days',
    icon: 'Paintbrush',
    popular: false,
  },
  {
    id: 's7',
    name: 'Windshield Replacement',
    category: 'bodyshop',
    description: 'OEM windshield replacement with calibration',
    price: 399,
    duration: '2-3 hours',
    icon: 'Square',
    popular: false,
  },
  {
    id: 's8',
    name: 'Comprehensive Insurance',
    category: 'insurance',
    description: 'Full coverage vehicle insurance',
    price: 1200,
    duration: 'Annual',
    icon: 'Shield',
    popular: true,
  },
];

// Dummy Tires & Batteries
export const tiresAndBatteries = {
  tires: [
    {
      id: 't1',
      brand: 'Michelin',
      model: 'Pilot Sport 4',
      size: '225/45R17',
      price: 189,
      rating: 4.9,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
    },
    {
      id: 't2',
      brand: 'Continental',
      model: 'PremiumContact 6',
      size: '235/40R18',
      price: 165,
      rating: 4.7,
      image: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=200&h=200&fit=crop',
    },
    {
      id: 't3',
      brand: 'Bridgestone',
      model: 'Potenza Sport',
      size: '245/35R19',
      price: 210,
      rating: 4.8,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
    },
  ],
  batteries: [
    {
      id: 'b1',
      brand: 'Exide',
      model: 'Premium AGM',
      capacity: '70Ah',
      warranty: '3 years',
      price: 199,
      slaExpiry: '2024-06-15',
    },
    {
      id: 'b2',
      brand: 'Amaron',
      model: 'Pro Din',
      capacity: '65Ah',
      warranty: '4 years',
      price: 175,
      slaExpiry: '2024-08-20',
    },
  ],
};

// Dummy Car Wash Packages
export const carWashPackages = [
  {
    id: 'cw1',
    name: 'Express Wash',
    description: 'Quick exterior wash and dry',
    price: 15,
    duration: '15 mins',
    features: ['Exterior Wash', 'Air Dry', 'Tire Shine'],
  },
  {
    id: 'cw2',
    name: 'Premium Wash',
    description: 'Full interior and exterior cleaning',
    price: 35,
    duration: '45 mins',
    features: ['Exterior Wash', 'Interior Vacuum', 'Dashboard Polish', 'Tire Shine', 'Air Freshener'],
    popular: true,
  },
  {
    id: 'cw3',
    name: 'Deluxe Detail',
    description: 'Complete detailing with wax protection',
    price: 75,
    duration: '2 hours',
    features: ['Full Wash', 'Clay Bar Treatment', 'Hand Wax', 'Leather Conditioning', 'Engine Bay Clean'],
  },
];

// Dummy Insurance Policies
export const insurancePolicies = [
  {
    id: 'ins1',
    vehicleId: '1',
    provider: 'SafeDrive Insurance',
    policyNumber: 'POL-2024-001234',
    type: 'Comprehensive',
    premium: 1200,
    startDate: '2024-01-01',
    expiryDate: '2024-12-31',
    status: 'active',
    coverage: ['Accident Damage', 'Theft', 'Fire', 'Natural Disasters', 'Third Party'],
  },
  {
    id: 'ins2',
    vehicleId: '2',
    provider: 'AutoShield Pro',
    policyNumber: 'POL-2024-005678',
    type: 'Third Party',
    premium: 450,
    startDate: '2024-03-15',
    expiryDate: '2024-06-14',
    status: 'expiring_soon',
    coverage: ['Third Party Liability', 'Legal Cover'],
  },
];

// Dummy Documents
export const documents = [
  {
    id: 'd1',
    vehicleId: '1',
    name: 'Registration Certificate',
    type: 'registration',
    uploadDate: '2024-01-15',
    expiryDate: '2027-01-15',
    fileUrl: '/documents/rc.pdf',
  },
  {
    id: 'd2',
    vehicleId: '1',
    name: 'Insurance Policy',
    type: 'insurance',
    uploadDate: '2024-01-01',
    expiryDate: '2024-12-31',
    fileUrl: '/documents/insurance.pdf',
  },
  {
    id: 'd3',
    vehicleId: '1',
    name: 'Pollution Certificate',
    type: 'puc',
    uploadDate: '2024-02-01',
    expiryDate: '2024-08-01',
    fileUrl: '/documents/puc.pdf',
  },
  {
    id: 'd4',
    vehicleId: '2',
    name: 'Registration Certificate',
    type: 'registration',
    uploadDate: '2023-06-20',
    expiryDate: '2026-06-20',
    fileUrl: '/documents/rc2.pdf',
  },
];

// Dummy Chat Messages
export const chatMessages = [
  {
    id: 'msg1',
    orderId: 'ORD-001',
    sender: 'merchant',
    message: 'Hello! Your vehicle has arrived at our service center.',
    timestamp: '2024-03-20T10:30:00',
    type: 'text',
  },
  {
    id: 'msg2',
    orderId: 'ORD-001',
    sender: 'customer',
    message: 'Great, thank you for the update!',
    timestamp: '2024-03-20T10:32:00',
    type: 'text',
  },
  {
    id: 'msg3',
    orderId: 'ORD-001',
    sender: 'merchant',
    message: 'We found some additional issues with your brake pads. Would you like us to replace them?',
    timestamp: '2024-03-20T11:15:00',
    type: 'text',
  },
  {
    id: 'msg4',
    orderId: 'ORD-001',
    sender: 'merchant',
    message: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    timestamp: '2024-03-20T11:16:00',
    type: 'image',
    caption: 'Current brake pad condition',
  },
  {
    id: 'msg5',
    orderId: 'ORD-001',
    sender: 'merchant',
    message: 'Additional brake pad replacement will cost $150. Do you approve?',
    timestamp: '2024-03-20T11:17:00',
    type: 'approval',
    approvalStatus: 'pending',
    amount: 150,
  },
];

// Dummy Support Tickets
export const supportTickets = [
  {
    id: 'TKT-001',
    subject: 'Delayed Delivery',
    description: 'My vehicle service was scheduled for yesterday but hasn\'t been delivered yet.',
    status: 'open',
    priority: 'high',
    createdAt: '2024-03-19T14:00:00',
    updates: [
      { message: 'Ticket created', timestamp: '2024-03-19T14:00:00' },
      { message: 'Assigned to support team', timestamp: '2024-03-19T14:05:00' },
    ],
  },
];

// Dummy Staff Orders
export const staffOrders = [
  {
    id: 'ORD-001',
    customer: 'John Doe',
    vehicle: vehicles[0],
    service: 'Full Vehicle Service',
    status: 'in_progress',
    assignedAt: '2024-03-20T09:00:00',
    checklist: [
      { item: 'Oil Change', completed: true },
      { item: 'Filter Replacement', completed: true },
      { item: 'Brake Inspection', completed: false },
      { item: 'Tire Rotation', completed: false },
      { item: 'Fluid Top-up', completed: false },
    ],
    beforeImages: [],
    afterImages: [],
  },
];

// Dummy Merchant Data
export const merchantData = {
  profile: {
    id: 'm1',
    name: 'AutoCare Pro Center',
    email: 'info@autocarepro.com',
    phone: '+1 234 567 8900',
    address: '123 Service Lane, Downtown',
    rating: 4.8,
    totalOrders: 1250,
    revenue: 125000,
  },
  orders: [
    {
      id: 'ORD-001',
      customer: 'John Doe',
      vehicle: 'Tesla Model 3',
      service: 'Full Vehicle Service',
      status: 'in_progress',
      amount: 299,
      scheduledDate: '2024-03-20',
    },
    {
      id: 'ORD-003',
      customer: 'Jane Smith',
      vehicle: 'Honda Civic',
      service: 'Oil Change',
      status: 'pending',
      amount: 89,
      scheduledDate: '2024-03-21',
    },
  ],
  stock: [
    { item: 'Engine Oil 5W-30', quantity: 45, reorderLevel: 20 },
    { item: 'Oil Filter', quantity: 32, reorderLevel: 15 },
    { item: 'Air Filter', quantity: 18, reorderLevel: 10 },
    { item: 'Brake Pads (Front)', quantity: 8, reorderLevel: 10 },
  ],
};

// Time Slots
export const timeSlots = [
  '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM',
];
