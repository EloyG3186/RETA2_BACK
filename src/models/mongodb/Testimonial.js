const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para testimonios
const TestimonialSchema = new Schema({
  author: {
    type: String, // UUID de PostgreSQL
    required: true
  },
  targetUser: {
    type: String, // UUID de PostgreSQL
    required: true
  },
  challengeId: {
    type: String, // UUID de PostgreSQL (opcional, si está relacionado con un desafío)
    default: null
  },
  content: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  tags: [String],
  likes: [{
    type: String, // UUID de PostgreSQL
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt
TestimonialSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Testimonial', TestimonialSchema);
