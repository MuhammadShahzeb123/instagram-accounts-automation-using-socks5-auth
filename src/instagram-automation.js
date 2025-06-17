const PlaywrightProxyManager = require('./playwright-proxy-chain');

class InstagramAutomation {
    constructor() {
        this.manager = new PlaywrightProxyManager();
    }    /**
     * Instagram automation task
     */
    async instagramTask(page, browserId, account = null) {
        try {
            console.log(`📸 Starting Instagram automation for ${browserId}...`);
            
            // Set extra headers to avoid detection
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            });

            // Set viewport to simulate real device
            await page.setViewportSize({ width: 1366, height: 768 });

            // Navigate to Instagram
            console.log(`🌐 Navigating to Instagram with ${browserId}...`);
            await page.goto('https://www.instagram.com/', { 
                waitUntil: 'networkidle',
                timeout: 30000 
            });

            // Wait for page to load
            await page.waitForTimeout(3000);

            // If account credentials are provided, try to login
            if (account && account.username && account.password) {
                await this.loginToInstagram(page, account, browserId);
            } else {
                // Just browse without logging in
                console.log(`👀 Browsing Instagram without login for ${browserId}`);
                
                // Take a screenshot
                await page.screenshot({ 
                    path: `instagram_${browserId}_${Date.now()}.png`,
                    fullPage: false 
                });
                
                console.log(`📷 Screenshot taken for ${browserId}`);
            }

            // Wait a bit to simulate human behavior
            await page.waitForTimeout(5000);

        } catch (error) {
            console.error(`❌ Instagram automation failed for ${browserId}:`, error.message);
        }
    }

    /**
     * Login to Instagram
     */
    async loginToInstagram(page, account, browserId) {
        try {
            console.log(`🔐 Attempting login for ${browserId} with account: ${account.username}`);

            // Wait for and click login elements
            await page.waitForSelector('input[name="username"]', { timeout: 10000 });
            
            // Fill username
            await page.fill('input[name="username"]', account.username);
            await page.waitForTimeout(1000);
            
            // Fill password
            await page.fill('input[name="password"]', account.password);
            await page.waitForTimeout(1000);
            
            // Click login button
            await page.click('button[type="submit"]');
            
            // Wait for navigation or error
            await page.waitForTimeout(5000);
            
            // Check if login was successful (basic check)
            const currentUrl = page.url();
            if (currentUrl.includes('/accounts/login/')) {
                console.log(`❌ Login failed for ${browserId} - still on login page`);
            } else {
                console.log(`✅ Login successful for ${browserId}`);
                
                // Take a screenshot after login
                await page.screenshot({ 
                    path: `instagram_${browserId}_logged_in_${Date.now()}.png`,
                    fullPage: false 
                });
            }

        } catch (error) {
            console.error(`❌ Login failed for ${browserId}:`, error.message);
        }
    }

    /**
     * Run Instagram automation with multiple proxies and accounts
     */
    async runMultipleInstagramAccounts(proxyAccountPairs, options = {}) {
        try {
            console.log(`🚀 Starting Instagram automation with ${proxyAccountPairs.length} proxy/account pairs...`);

            const proxies = proxyAccountPairs.map(pair => pair.proxy);
              const instagramTask = async (page, browserId) => {
                // Find the account for this browser
                const pair = proxyAccountPairs.find(p => p.browserId === browserId);
                const account = pair ? pair.account : null;
                
                await this.instagramTask(page, browserId, account);
            };

            // Add browserIds to pairs for tracking
            proxyAccountPairs.forEach((pair, index) => {
                pair.browserId = `browser_${index + 1}`;
            });

            const results = await this.manager.runMultipleBrowsers(proxies, instagramTask, {
                headless: options.headless || false,
                closeImmediately: options.closeImmediately || false
            });

            return results;

        } catch (error) {
            console.error('❌ Multiple Instagram automation failed:', error.message);
            throw error;
        }
    }

    /**
     * Close all browsers and cleanup
     */
    async cleanup() {
        await this.manager.closeAll();
    }
}

// Example usage
async function exampleInstagramAutomation() {
    const instagram = new InstagramAutomation();
    
    // Example configuration - replace with your actual data
    const proxyAccountPairs = [
        {
            proxy: 'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F',
            account: {
                username: 'your_instagram_username_1',
                password: 'your_instagram_password_1'
            }
        },
        // Add more proxy/account pairs here:
        // {
        //     proxy: 'socks5:another.proxy.ip:port:user:pass',
        //     account: {
        //         username: 'your_instagram_username_2',
        //         password: 'your_instagram_password_2'
        //     }
        // },
    ];

    try {
        const results = await instagram.runMultipleInstagramAccounts(proxyAccountPairs, {
            headless: false, // Set to true to run in background
            closeImmediately: false // Keep browsers open to see results
        });
        
        console.log('\n📊 Instagram automation results:', results);
        
    } catch (error) {
        console.error('❌ Instagram automation failed:', error.message);
    } finally {
        await instagram.cleanup();
    }
}

// Test without login (just to verify proxy works with Instagram)
async function testInstagramWithoutLogin() {
    console.log('🧪 Testing Instagram access without login...\n');
    
    const instagram = new InstagramAutomation();
    
    const proxyAccountPairs = [
        {
            proxy: 'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F',
            account: null // No login, just browse
        }
    ];

    try {
        await instagram.runMultipleInstagramAccounts(proxyAccountPairs, {
            headless: false,
            closeImmediately: false
        });
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

module.exports = InstagramAutomation;

// Run test if this file is executed directly
if (require.main === module) {
    // Test without login first
    testInstagramWithoutLogin().catch(console.error);
    
    // Uncomment below to test with actual login credentials:
    // exampleInstagramAutomation().catch(console.error);
}
