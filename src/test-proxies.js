const { ProxyManager } = require('./main.js');

async function testSingleProxy() {
    const proxyManager = new ProxyManager();
    
    try {
        console.log('🧪 Testing single proxy...');
        
        const proxyString = 'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F';
        
        // Test proxy connectivity
        const isWorking = await proxyManager.testProxy(proxyString);
        
        if (!isWorking) {
            console.log('❌ Proxy test failed');
            return;
        }
        
        // Create browser with proxy
        const { browser, context } = await proxyManager.createBrowserWithProxy(proxyString);
        const page = await context.newPage();
        
        // Test navigation
        console.log('🌐 Testing navigation...');
        await page.goto('https://httpbin.org/ip');
        const ipResult = await page.textContent('body');
        console.log('IP Result:', JSON.parse(ipResult));
        
        // Test Instagram access
        console.log('📱 Testing Instagram access...');
        await page.goto('https://www.instagram.com/');
        await page.waitForTimeout(3000);
        
        const title = await page.title();
        console.log('Instagram page title:', title);
        
        // Take screenshot for verification
        await page.screenshot({ path: 'test-screenshot.png' });
        console.log('📸 Screenshot saved as test-screenshot.png');
        
        await browser.close();
        console.log('✅ Single proxy test completed successfully');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await proxyManager.cleanup();
    }
}

async function testMultipleProxies() {
    const proxyManager = new ProxyManager();
    
    try {
        console.log('🧪 Testing multiple proxies...');
        
        // Add your proxy list here
        const proxyList = [
            'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F',
            // Add more proxies for testing:
            // 'socks5:IP:PORT:USER:PASS',
        ];
        
        // Simple automation task for testing
        const testTask = async (page, context, taskId) => {
            // Get IP
            await page.goto('https://httpbin.org/ip');
            const ipContent = await page.textContent('body');
            const ipData = JSON.parse(ipContent);
            
            // Visit a test site
            await page.goto('https://www.example.com');
            const title = await page.title();
            
            console.log(`✅ Task ${taskId} - IP: ${ipData.origin}, Title: ${title}`);
            
            return { ip: ipData.origin, title };
        };
        
        // Run on multiple proxies
        const results = await proxyManager.runMultipleProxies(proxyList, testTask, { 
            maxConcurrent: 2 
        });
        
        console.log('\n📊 Test Results:');
        results.forEach(result => {
            console.log(`Task ${result.taskId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
            if (result.result) {
                console.log(`  IP: ${result.result.ip}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Multiple proxy test failed:', error);
    } finally {
        await proxyManager.cleanup();
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting proxy tests...\n');
    
    // Choose which test to run
    const testType = process.argv[2] || 'single';
    
    if (testType === 'single') {
        await testSingleProxy();
    } else if (testType === 'multiple') {
        await testMultipleProxies();
    } else {
        console.log('Usage: node test-proxies.js [single|multiple]');
    }
}

if (require.main === module) {
    runTests();
}
