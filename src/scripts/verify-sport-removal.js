const http = require('http');

function testAPI() {
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/challenges',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (response.data && response.data.length > 0) {
          const challenge = response.data[0];
          
          console.log('✅ API Response received');
          console.log('📋 First Challenge:');
          console.log('- Title:', challenge.title);
          console.log('- Category:', challenge.category);
          console.log('- CategoryName:', challenge.categoryName);
          
          if (challenge.hasOwnProperty('sport')) {
            console.log('❌ ERROR: Sport field still exists!');
            console.log('- Sport value:', challenge.sport);
          } else {
            console.log('✅ SUCCESS: Sport field removed successfully!');
          }
          
          console.log('\n📝 All challenge fields:');
          console.log(Object.keys(challenge));
          
        } else {
          console.log('❌ No challenges found in response');
        }
      } catch (error) {
        console.error('❌ Error parsing JSON:', error.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
  });

  req.end();
}

testAPI();
