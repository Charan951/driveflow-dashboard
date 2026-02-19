import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    name: { type: String, unique: true, required: true },
    seq: { type: Number, default: 999 },
  },
  { timestamps: true }
);

counterSchema.statics.next = async function (name) {
  const doc = await this.findOneAndUpdate(
    { name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return doc.seq;
};

const Counter = mongoose.model('Counter', counterSchema);

export default Counter;
