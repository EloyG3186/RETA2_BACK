const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para miembros de la comunidad
const MemberSchema = new Schema({
  userId: {
    type: String, // UUID de PostgreSQL
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'moderator', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'banned'],
    default: 'active'
  }
});

// Esquema para publicaciones en la comunidad
const PostSchema = new Schema({
  author: {
    type: String, // UUID de PostgreSQL
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    url: String,
    contentType: String
  }],
  likes: [{
    type: String, // UUID de PostgreSQL
    ref: 'User'
  }],
  comments: [{
    author: {
      type: String, // UUID de PostgreSQL
      required: true
    },
    content: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
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

// Esquema para comunidades
const CommunitySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  createdBy: {
    type: String, // UUID de PostgreSQL
    required: true
  },
  imageUrl: {
    type: String,
    default: null
  },
  coverImageUrl: {
    type: String,
    default: null
  },
  members: [MemberSchema],
  posts: [PostSchema],
  rules: [{
    title: String,
    description: String
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  inviteCode: {
    type: String,
    default: null
  },
  tags: [String],
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
CommunitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Community', CommunitySchema);
