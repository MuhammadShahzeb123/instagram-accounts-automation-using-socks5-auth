const { chromium } = require('playwright');

// Simple example to test SOCKS5 proxy with authentication
async function testProxyConnection() {
    console.log('🧪 Testing SOCKS5 proxy connection...');
    
    // Your proxy configuration
    const proxyConfig = {
        server: 'socks5://134.195.152.111:9234',
        username: 'P1yUB7',
        password: 'N1ZT9F'
    };
    
    let browser = null;
    
    try {
        // Launch browser with proxy
        browser = await chromium.launch({
            headless: false, // Set to true for headless mode
            proxy: proxyConfig,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        console.log('✅ Browser launched with proxy');
        
        // Create a new page
        const page = await browser.newPage();
        
        // Test IP address
        console.log('🌐 Checking IP address...');
        await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle' });
        
        const ipContent = await page.textContent('body');
        const ipData = JSON.parse(ipContent);
        
        console.log(`🎯 Your IP through proxy: ${ipData.origin}`);
        
        // Test Instagram access
        console.log('📱 Testing Instagram access...');
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
        
        const title = await page.title();
        console.log(`📄 Instagram page title: ${title}`);
        
        // Wait for 3 seconds to see the page
        await page.waitForTimeout(3000);
        
        console.log('✅ Test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the test
if (require.main === module) {
    testProxyConnection();
}

module.exports = { testProxyConnection };
