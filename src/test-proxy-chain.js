const PlaywrightProxyManager = require('./playwright-proxy-chain');

async function testSingleProxy() {
    console.log('🚀 Testing single SOCKS5 proxy with Playwright + proxy-chain...\n');
    
    const manager = new PlaywrightProxyManager();
    const testProxy = 'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F';
    
    try {
        // Launch browser with proxy
        const { browser, browserId } = await manager.launchBrowserWithProxy(testProxy);
        
        // Test the IP to verify proxy is working
        const ip = await manager.testBrowserIP(browser, browserId);
        
        if (ip) {
            console.log(`\n✅ SUCCESS! Your proxy is working.`);
            console.log(`📍 Your current IP through proxy: ${ip}`);
        } else {
            console.log(`\n❌ Failed to get IP - proxy might not be working`);
        }
        
        // Close everything
        await manager.closeAll();
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        await manager.closeAll();
    }
}

async function testMultipleProxies() {
    console.log('\n🔥 Testing multiple proxies simultaneously...\n');
    
    const manager = new PlaywrightProxyManager();
    
    // Example: You can add more proxies here in the same format
    const proxies = [
        'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F',
        // Add more proxies here when you have them:
        // 'socks5:another.proxy.ip:port:user:pass',
        // 'socks5:yet.another.proxy.ip:port:user:pass',
    ];
    
    // Custom automation task
    const automationTask = async (page, browserId) => {
        console.log(`🤖 Running automation for ${browserId}...`);
        
        // Navigate to a website
        await page.goto('https://httpbin.org/headers', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        
        // Get the page content to see headers
        const content = await page.textContent('body');
        const headers = JSON.parse(content);
        
        console.log(`📱 User-Agent for ${browserId}:`, headers.headers['User-Agent']);
        
        // You can add more automation here:
        // - Fill forms
        // - Click buttons
        // - Scrape data
        // - Take screenshots
        // - Set cookies
        // etc.
    };
    
    try {
        const results = await manager.runMultipleBrowsers(proxies, automationTask, {
            headless: false, // Set to true to run in background
            closeImmediately: false // Keep browsers open for a bit
        });
        
        console.log('\n📊 Results:', results);
        
    } catch (error) {
        console.error('\n❌ Multiple proxy test failed:', error.message);
    }
}

async function main() {
    try {
        // Test single proxy first
        await testSingleProxy();
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test multiple proxies
        await testMultipleProxies();
        
    } catch (error) {
        console.error('❌ Main test failed:', error.message);
    }
}

// Run the tests
main().catch(console.error);
