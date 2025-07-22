const { sequelize } = require('../config/database');
const { connectMongoDB } = require('../config/mongodb');

async function testConnections() {
  console.log('🔍 Testing database connections...');
  
  try {
    // Test PostgreSQL connection
    console.log('📊 Testing PostgreSQL connection...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connection successful');
    
    // Test MongoDB connection
    console.log('🍃 Testing MongoDB connection...');
    const mongoConnected = await connectMongoDB();
    if (mongoConnected) {
      console.log('✅ MongoDB connection successful');
    } else {
      console.log('❌ MongoDB connection failed');
    }
    
    console.log('🎉 Database connection tests completed');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
  } finally {
    // Close connections
    await sequelize.close();
    if (require('mongoose').connection.readyState === 1) {
      await require('mongoose').connection.close();
    }
  }
}

// Run if called directly
if (require.main === module) {
  testConnections()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testConnections };
