console.log('🔍 Starting simple test...');

// Test basic Node.js functionality
console.log('✅ Node.js is working');

// Test environment variables
console.log('📋 Environment variables:');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  PORT:', process.env.PORT || 'not set');
console.log('  DB_NAME:', process.env.DB_NAME || 'not set');
console.log('  MONGODB_URI:', process.env.MONGODB_URI || 'not set');

// Test require functionality
try {
  console.log('📦 Testing require...');
  const express = require('express');
  console.log('✅ Express require successful');
  
  const { Sequelize } = require('sequelize');
  console.log('✅ Sequelize require successful');
  
  const mongoose = require('mongoose');
  console.log('✅ Mongoose require successful');
  
} catch (error) {
  console.error('❌ Require test failed:', error);
}

console.log('🎉 Simple test completed');
process.exit(0);
