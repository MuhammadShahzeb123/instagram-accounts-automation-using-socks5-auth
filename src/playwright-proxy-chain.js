const { chromium } = require('playwright');
const ProxyChain = require('proxy-chain');

class PlaywrightProxyManager {
    constructor() {
        this.proxyServers = new Map(); // Store active proxy servers
        this.browsers = new Map(); // Store active browsers
    }

    /**
     * Parse SOCKS5 proxy string format: socks5:IP:PORT:USER:PASS
     */
    parseProxyString(proxyString) {
        const parts = proxyString.split(':');
        if (parts.length !== 5 || parts[0] !== 'socks5') {
            throw new Error('Invalid proxy format. Expected: socks5:IP:PORT:USER:PASS');
        }
        
        return {
            protocol: 'socks5',
            hostname: parts[1],
            port: parseInt(parts[2]),
            username: parts[3],
            password: parts[4]
        };
    }

    /**
     * Create a local HTTP proxy server that forwards to SOCKS5 proxy
     */
    async createProxyServer(proxyString, proxyId = 'default') {
        try {
            const proxyConfig = this.parseProxyString(proxyString);
            
            // Create the SOCKS5 URL with authentication
            const socksUrl = `socks5://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.hostname}:${proxyConfig.port}`;
            
            console.log(`Creating proxy server for: ${proxyConfig.hostname}:${proxyConfig.port}`);            // Create local HTTP proxy server that forwards to SOCKS5
            const proxyUrl = await ProxyChain.anonymizeProxy(socksUrl);
            
            this.proxyServers.set(proxyId, {
                url: proxyUrl,
                originalProxy: proxyString
            });

            console.log(`✅ Proxy server created: ${proxyUrl} -> ${proxyConfig.hostname}:${proxyConfig.port}`);
            return proxyUrl;
        } catch (error) {
            console.error(`❌ Failed to create proxy server:`, error.message);
            throw error;
        }
    }    /**
     * Launch a Playwright browser with proxy
     */
    async launchBrowserWithProxy(proxyString, browserId = null, options = {}) {
        try {
            const id = browserId || `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Create proxy server for this browser
            const localProxyUrl = await this.createProxyServer(proxyString, id);
            
            // Launch browser with the local proxy
            const browser = await chromium.launch({
                headless: options.headless || false,
                proxy: {
                    server: localProxyUrl
                },
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });

            this.browsers.set(id, browser);
            
            console.log(`🚀 Browser launched with ID: ${id}`);
            return { browser, browserId: id };
        } catch (error) {
            console.error(`❌ Failed to launch browser:`, error.message);
            throw error;
        }
    }    /**
     * Test a browser's IP address to verify proxy is working
     */
    async testBrowserIP(browser, browserId) {
        try {
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            });
            const page = await context.newPage();
            
            console.log(`🔍 Testing IP for browser ${browserId}...`);
            
            // Navigate to IP checking service
            await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle' });
            
            // Get the IP from the response
            const content = await page.textContent('body');
            const ipData = JSON.parse(content);
            
            console.log(`📍 Browser ${browserId} IP: ${ipData.origin}`);
            
            await context.close();
            return ipData.origin;
        } catch (error) {
            console.error(`❌ Failed to test IP for browser ${browserId}:`, error.message);
            return null;
        }
    }    /**
     * Run automation task on a browser
     */
    async runAutomationTask(browser, browserId, task) {
        try {
            console.log(`🤖 Running automation task for browser ${browserId}...`);
            
            const context = await browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            });
            const page = await context.newPage();
            
            // Execute the custom task function
            if (typeof task === 'function') {
                await task(page, browserId);
            } else {
                // Default task - just navigate to a website
                await page.goto('https://example.com', { waitUntil: 'networkidle' });
                await page.waitForTimeout(2000);
                console.log(`✅ Browser ${browserId} completed default navigation task`);
            }
            
            await context.close();
        } catch (error) {
            console.error(`❌ Automation task failed for browser ${browserId}:`, error.message);
        }
    }

    /**
     * Close a specific browser and its proxy server
     */
    async closeBrowser(browserId) {
        try {
            // Close browser
            if (this.browsers.has(browserId)) {
                await this.browsers.get(browserId).close();
                this.browsers.delete(browserId);
                console.log(`🔒 Browser ${browserId} closed`);
            }            // Close proxy server
            if (this.proxyServers.has(browserId)) {
                const proxyInfo = this.proxyServers.get(browserId);
                if (proxyInfo.url) {
                    await ProxyChain.closeAnonymizedProxy(proxyInfo.url, true);
                }
                this.proxyServers.delete(browserId);
                console.log(`🔒 Proxy server for ${browserId} closed`);
            }
        } catch (error) {
            console.error(`❌ Failed to close browser ${browserId}:`, error.message);
        }
    }

    /**
     * Close all browsers and proxy servers
     */
    async closeAll() {
        console.log('🧹 Cleaning up all browsers and proxy servers...');
        
        // Close all browsers
        for (const [id, browser] of this.browsers) {
            try {
                await browser.close();
                console.log(`🔒 Browser ${id} closed`);
            } catch (error) {
                console.error(`❌ Failed to close browser ${id}:`, error.message);
            }
        }
          // Close all proxy servers
        for (const [id, proxyInfo] of this.proxyServers) {
            try {
                if (proxyInfo.url) {
                    await ProxyChain.closeAnonymizedProxy(proxyInfo.url, true);
                }
                console.log(`🔒 Proxy server ${id} closed`);
            } catch (error) {
                console.error(`❌ Failed to close proxy server ${id}:`, error.message);
            }
        }
        
        this.browsers.clear();
        this.proxyServers.clear();
        console.log('✅ Cleanup completed');
    }

    /**
     * Run multiple browsers with different proxies simultaneously
     */
    async runMultipleBrowsers(proxies, automationTask, options = {}) {
        const results = [];
        const browsers = [];

        try {
            console.log(`🚀 Launching ${proxies.length} browsers with different proxies...`);
            
            // Launch all browsers simultaneously
            const launchPromises = proxies.map(async (proxy, index) => {
                const browserId = `browser_${index + 1}`;
                try {
                    const { browser } = await this.launchBrowserWithProxy(proxy, browserId, options);
                    browsers.push({ browser, browserId, proxy });
                    return { browser, browserId, proxy, success: true };
                } catch (error) {
                    console.error(`❌ Failed to launch browser ${browserId}:`, error.message);
                    return { browserId, proxy, success: false, error: error.message };
                }
            });

            const launchResults = await Promise.all(launchPromises);
            
            // Test IPs for all successful browsers
            const ipTestPromises = launchResults
                .filter(result => result.success)
                .map(async ({ browser, browserId }) => {
                    const ip = await this.testBrowserIP(browser, browserId);
                    return { browserId, ip };
                });

            const ipResults = await Promise.all(ipTestPromises);
            
            // Run automation tasks for all browsers
            if (automationTask) {
                const taskPromises = browsers.map(async ({ browser, browserId }) => {
                    try {
                        await this.runAutomationTask(browser, browserId, automationTask);
                        return { browserId, taskSuccess: true };
                    } catch (error) {
                        return { browserId, taskSuccess: false, error: error.message };
                    }
                });

                const taskResults = await Promise.all(taskPromises);
                results.push(...taskResults);
            }

            // Keep browsers open for a bit to see them in action
            if (!options.closeImmediately) {
                console.log('⏳ Keeping browsers open for 10 seconds...');
                await new Promise(resolve => setTimeout(resolve, 10000));
            }

            return { launchResults, ipResults, taskResults: results };
            
        } catch (error) {
            console.error('❌ Error in runMultipleBrowsers:', error.message);
            throw error;
        } finally {
            // Clean up all browsers and proxies
            await this.closeAll();
        }
    }
}

module.exports = PlaywrightProxyManager;

// Example usage and testing
async function main() {
    const manager = new PlaywrightProxyManager();
    
    // Your proxy
    const testProxy = 'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F';
    
    try {
        console.log('🧪 Testing single browser with proxy...');
        
        // Test single browser
        const { browser, browserId } = await manager.launchBrowserWithProxy(testProxy, 'test_browser');
        
        // Test IP
        const ip = await manager.testBrowserIP(browser, browserId);
        console.log(`✅ Proxy working! Your IP: ${ip}`);
        
        // Run a simple automation task
        await manager.runAutomationTask(browser, browserId, async (page, id) => {
            console.log(`🌐 Navigating to Google with browser ${id}...`);
            await page.goto('https://www.google.com', { waitUntil: 'networkidle' });
            await page.waitForTimeout(3000);
            
            const title = await page.title();
            console.log(`📄 Page title: ${title}`);
        });
        
        await manager.closeAll();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        await manager.closeAll();
    }
}

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}
