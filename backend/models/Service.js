import mongoose from 'mongoose';

const serviceSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number, // duration in minutes
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['Periodic', 'Repair', 'Wash', 'Tyres', 'Denting', 'Painting', 'Detailing', 'AC', 'Accessories', 'Other'],
    },
    vehicleType: {
      type: String,
      required: true,
      enum: ['Car'],
      default: 'Car',
    },
    image: {
      type: String,
      default: '',
    },
    features: [{
      type: String, // list of features included in the service
    }],
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ vehicleType: 1, category: 1, name: 1 });

const Service = mongoose.model('Service', serviceSchema);

export default Service;
