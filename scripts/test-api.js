// Test script to verify API connections
async function testAPIConnection() {
  try {
    console.log('Testing API connection...')
    
    const response = await fetch('http://localhost:3005/api/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Hello, this is a test message. Please respond with "API connection successful!"',
        system: 'You are a helpful assistant. Always respond exactly as requested.',
        temperature: 0.1,
        maxTokens: 50
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log('Error response:', errorText)
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log('API Response:', data)
    
    if (data.text) {
      console.log('✅ API connection successful!')
      console.log('Response text:', data.text)
    } else {
      console.log('❌ API response missing text field')
    }
    
  } catch (error) {
    console.error('❌ API connection failed:', error)
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testAPIConnection()
}

module.exports = testAPIConnection