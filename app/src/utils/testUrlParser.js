// Test script for URL parsing functionality
// Run this in the browser console when on the AddJob page

async function testUrlParser() {
  const testUrls = [
    'https://jobs.nhs.uk/xi/vacancy/938293/senior-software-developer-band-7-permanent/details',
    'https://uk.indeed.com/viewjob?jk=1234567890',
    'https://www.linkedin.com/jobs/view/3456789012/',
    'https://www.reed.co.uk/jobs/software-developer/43210987'
  ];

  console.log('🧪 Testing URL Parser Service...\n');

  for (const url of testUrls) {
    console.log(`Testing: ${url}`);
    
    try {
      const response = await fetch('http://localhost:4000/api/jobs/parse-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ez-token')}`
        },
        body: JSON.stringify({ url })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Success:', {
          title: result.title,
          company: result.company,
          location: result.location,
          source: result.source
        });
      } else {
        console.log('❌ Failed:', result.error);
      }
    } catch (error) {
      console.error('🔥 Error:', error.message);
    }
    
    console.log('---');
  }
  
  console.log('🏁 URL Parser tests completed!');
}

// Export for use
window.testUrlParser = testUrlParser;

console.log('💡 URL Parser Test Tool loaded!');
console.log('Run testUrlParser() to test the parsing functionality');
