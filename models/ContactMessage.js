const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email'
      ],
      lowercase: true
    },
    subject: {
      type: String,
      required: [true, 'Please provide a subject'],
      trim: true,
      maxlength: [200, 'Subject cannot exceed 200 characters']
    },
    message: {
      type: String,
      required: [true, 'Please provide a message'],
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters']
    },
    status: {
      type: String,
      enum: ['new', 'read', 'replied', 'archived'],
      default: 'new'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    category: {
      type: String,
      enum: ['general', 'submission', 'publication', 'technical', 'other'],
      default: 'general'
    },
    adminNotes: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'contact_messages'
  }
);

// Index for faster queries
contactMessageSchema.index({ email: 1, createdAt: -1 });
contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ category: 1, createdAt: -1 });

// Pre-save middleware to update updatedAt
contactMessageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('ContactMessage', contactMessageSchema);

