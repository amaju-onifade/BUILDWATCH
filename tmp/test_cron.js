
const CRON_SECRET = 'dev-cron-secret-local';
const APP_URL = 'http://localhost:3000';

async function testCron() {
  try {
    console.log('Testing Heartbeat Cron...');
    const response = await fetch(`${APP_URL}/api/cron/heartbeat`, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });
    
    const status = response.status;
    const body = await response.json();
    
    console.log(`Status: ${status}`);
    console.log('Body:', JSON.stringify(body, null, 2));
    
    if (status === 200 && body.ok) {
      console.log('✅ Cron test passed!');
    } else {
      console.log('❌ Cron test failed!');
    }
  } catch (error) {
    console.error('Error testing cron:', error.message);
  }
}

testCron();
