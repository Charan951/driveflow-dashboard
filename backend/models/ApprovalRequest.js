import mongoose from 'mongoose';

const approvalRequestSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['UserRegistration', 'PartReplacement', 'ExtraCost', 'BillEdit'],
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'relatedModel',
  },
  relatedModel: {
    type: String,
    required: true,
    enum: ['User', 'Booking'],
  },
  data: {
    type: Object, // Flexible for different request types (e.g. { newAmount: 500, reason: "Oil leak" })
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  adminComment: {
    type: String,
  },
  resolvedAt: {
    type: Date,
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, {
  timestamps: true,
});

const ApprovalRequest = mongoose.model('ApprovalRequest', approvalRequestSchema);
export default ApprovalRequest;