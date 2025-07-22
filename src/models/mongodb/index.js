const { mongoose, connectMongoDB } = require('../../config/mongodb');
const Chat = require('./Chat');
const Community = require('./Community');
const Testimonial = require('./Testimonial');
const { FriendRequest, Friendship, FriendNetwork } = require('./FriendNetwork');
const EnrichedComment = require('./EnrichedComment');

module.exports = {
  mongoose,
  connectMongoDB,
  Chat,
  Community,
  Testimonial,
  FriendRequest,
  Friendship,
  FriendNetwork,
  EnrichedComment
};
