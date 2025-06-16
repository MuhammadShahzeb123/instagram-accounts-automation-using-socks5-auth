const { chromium } = require('playwright');

class ProxyManager {
    constructor() {
        this.browsers = [];
        this.contexts = [];
    }

    /**
     * Parse proxy string in format: IP:PORT:USER:PASS
     * @param {string} proxyString 
     * @returns {object} Parsed proxy configuration
     */
    parseProxy(proxyString) {
        const parts = proxyString.split(':');
        if (parts.length !== 4) {
            throw new Error('Proxy format should be IP:PORT:USER:PASS');
        }
        
        return {
            server: `socks5://${parts[0]}:${parts[1]}`,
            username: parts[2],
            password: parts[3]
        };
    }

    /**
     * Create a browser instance with SOCKS5 proxy
     * @param {string} proxyString - Proxy in format IP:PORT:USER:PASS
     * @param {object} options - Additional browser options
     * @returns {Promise<object>} Browser and context instances
     */
    async createBrowserWithProxy(proxyString, options = {}) {
        try {
            const proxyConfig = this.parseProxy(proxyString);
            
            console.log(`🚀 Creating browser with proxy: ${proxyConfig.server}`);
            
            // Launch browser with proxy configuration
            const browser = await chromium.launch({
                headless: options.headless || false,
                proxy: proxyConfig,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });

            // Create context with additional stealth options
            const context = await browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                locale: 'en-US',
                timezoneId: 'America/New_York',
                permissions: [],
                extraHTTPHeaders: {
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });

            // Store references for cleanup
            this.browsers.push(browser);
            this.contexts.push(context);

            return { browser, context, proxy: proxyConfig };
        } catch (error) {
            console.error(`❌ Error creating browser with proxy ${proxyString}:`, error.message);
            throw error;
        }
    }

    /**
     * Test proxy connectivity
     * @param {string} proxyString 
     * @returns {Promise<boolean>} Whether proxy is working
     */
    async testProxy(proxyString) {
        let browser = null;
        let context = null;
        
        try {
            const result = await this.createBrowserWithProxy(proxyString, { headless: true });
            browser = result.browser;
            context = result.context;
            
            const page = await context.newPage();
            
            // Test with a simple IP check
            await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle' });
            const content = await page.textContent('body');
            const ipData = JSON.parse(content);
            
            console.log(`✅ Proxy ${proxyString} is working. IP: ${ipData.origin}`);
            
            await browser.close();
            return true;
        } catch (error) {
            console.error(`❌ Proxy ${proxyString} failed:`, error.message);
            if (browser) await browser.close();
            return false;
        }
    }

    /**
     * Run automation task on multiple proxies simultaneously
     * @param {Array<string>} proxyList - List of proxy strings
     * @param {Function} automationTask - Task to run on each browser
     * @param {object} options - Additional options
     */
    async runMultipleProxies(proxyList, automationTask, options = {}) {
        const maxConcurrent = options.maxConcurrent || 5;
        const results = [];
        
        console.log(`🔄 Starting automation with ${proxyList.length} proxies (max ${maxConcurrent} concurrent)`);
        
        // Process proxies in batches
        for (let i = 0; i < proxyList.length; i += maxConcurrent) {
            const batch = proxyList.slice(i, i + maxConcurrent);
            
            const batchPromises = batch.map(async (proxyString, index) => {
                const taskId = i + index + 1;
                try {
                    console.log(`📱 Starting task ${taskId} with proxy: ${proxyString.split(':')[0]}:${proxyString.split(':')[1]}`);
                    
                    const { browser, context } = await this.createBrowserWithProxy(proxyString);
                    const page = await context.newPage();
                    
                    // Run the automation task
                    const result = await automationTask(page, context, taskId);
                    
                    await browser.close();
                    
                    console.log(`✅ Task ${taskId} completed successfully`);
                    return { taskId, proxy: proxyString, success: true, result };
                } catch (error) {
                    console.error(`❌ Task ${taskId} failed:`, error.message);
                    return { taskId, proxy: proxyString, success: false, error: error.message };
                }
            });
            
            const batchResults = await Promise.allSettled(batchPromises);
            results.push(...batchResults.map(r => r.value || r.reason));
            
            // Small delay between batches
            if (i + maxConcurrent < proxyList.length) {
                console.log(`⏸️  Waiting 2 seconds before next batch...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        return results;
    }

    /**
     * Clean up all browser instances
     */
    async cleanup() {
        console.log('🧹 Cleaning up browser instances...');
        
        for (const context of this.contexts) {
            try {
                await context.close();
            } catch (error) {
                console.error('Error closing context:', error.message);
            }
        }
        
        for (const browser of this.browsers) {
            try {
                await browser.close();
            } catch (error) {
                console.error('Error closing browser:', error.message);
            }
        }
        
        this.browsers = [];
        this.contexts = [];
    }
}

// Example automation task for Instagram or any website
async function exampleAutomationTask(page, context, taskId) {
    try {
        // Example: Check IP and visit Instagram
        await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle' });
        const ipContent = await page.textContent('body');
        const ipData = JSON.parse(ipContent);
        
        console.log(`🌐 Task ${taskId} IP: ${ipData.origin}`);
        
        // Navigate to Instagram (or any other site)
        await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
        
        // Wait for page to load
        await page.waitForTimeout(3000);
        
        // You can add your Instagram automation logic here
        // For example: login, post, like, follow, etc.
        
        const title = await page.title();
        console.log(`📄 Task ${taskId} page title: ${title}`);
        
        // Example: Set cookies if needed
        // await context.addCookies([
        //     { name: 'sessionid', value: 'your_session_value', domain: '.instagram.com', path: '/' }
        // ]);
        
        return {
            ip: ipData.origin,
            title: title,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error(`❌ Automation task ${taskId} error:`, error.message);
        throw error;
    }
}

// Main execution function
async function main() {
    const proxyManager = new ProxyManager();
    
    try {
        // Your proxy list - add more proxies here
        const proxyList = [
            'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F',
            // Add more proxies in the same format:
            // 'socks5:IP:PORT:USER:PASS',
            // 'socks5:IP:PORT:USER:PASS',
        ];
        
        console.log('🔍 Testing proxies...');
        
        // Test all proxies first (optional)
        const workingProxies = [];
        for (const proxy of proxyList) {
            const isWorking = await proxyManager.testProxy(proxy);
            if (isWorking) {
                workingProxies.push(proxy);
            }
        }
        
        console.log(`✅ ${workingProxies.length}/${proxyList.length} proxies are working`);
        
        if (workingProxies.length === 0) {
            console.log('❌ No working proxies found. Exiting...');
            return;
        }
        
        // Run automation tasks on multiple proxies
        const results = await proxyManager.runMultipleProxies(
            workingProxies, 
            exampleAutomationTask,
            { maxConcurrent: 3 } // Adjust based on your system capacity
        );
        
        // Print results summary
        console.log('\n📊 Results Summary:');
        console.log('==================');
        results.forEach(result => {
            if (result.success) {
                console.log(`✅ Task ${result.taskId}: Success - IP: ${result.result?.ip}`);
            } else {
                console.log(`❌ Task ${result.taskId}: Failed - ${result.error}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Main execution error:', error);
    } finally {
        await proxyManager.cleanup();
        console.log('🏁 Script completed');
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT. Cleaning up...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM. Cleaning up...');
    process.exit(0);
});

// Export for use in other modules
module.exports = { ProxyManager, exampleAutomationTask };

// Run if this file is executed directly
if (require.main === module) {
    main();
}
