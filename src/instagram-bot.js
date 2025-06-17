const ProxyManager = require('./proxy-manager');
const CookieManager = require('./cookie-manager');

class InstagramBot {
    constructor() {
        this.proxyManager = new ProxyManager();
        this.cookieManager = new CookieManager();
    }

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

            if (account && account.username && account.password) {
                // Load saved cookies first
                const context = page.context();
                const cookiesLoaded = await this.cookieManager.loadCookies(account.username, context);
                
                // Navigate to Instagram main page
                console.log(`🌐 Navigating to Instagram main page for ${account.username}...`);
                await page.goto('https://www.instagram.com/', { 
                    waitUntil: 'networkidle',
                    timeout: 30000 
                });
                await page.waitForTimeout(3000);
                
                // Check if we're logged in by looking for "Don't have an account?" text
                const isLoggedIn = await this.cookieManager.checkLoginStatus(page, account.username);
                
                if (isLoggedIn) {
                    console.log(`✅ ${account.username} already logged in`);
                    await this.takeScreenshot(page, browserId, 'already_logged_in');
                    return;
                } else {
                    console.log(`⚠️ ${account.username} not logged in, attempting login on current page...`);
                    await this.loginToInstagram(page, account, browserId);
                }
            } else {
                // Just browse without logging in
                console.log(`👀 Browsing Instagram without login for ${browserId}`);
                await page.goto('https://www.instagram.com/', { 
                    waitUntil: 'networkidle',
                    timeout: 30000 
                });
                
                await page.waitForTimeout(3000);
                await this.takeScreenshot(page, browserId, 'no_login');
            }

            // Wait a bit to simulate human behavior
            await page.waitForTimeout(5000);

        } catch (error) {
            console.error(`❌ Instagram automation failed for ${browserId}:`, error.message);
        }
    }

    /**
     * Login to Instagram on the current page (no navigation to login page)
     */
    async loginToInstagram(page, account, browserId) {
        try {
            console.log(`🔐 Attempting login on current page for ${account.username}...`);
            console.log(`📍 Current URL: ${page.url()}`);

            // We're already on Instagram main page, just fill the login form
            console.log(`🔍 Looking for login form on current page...`);
            
            // Wait for username field
            await page.waitForSelector('input[name="username"]', { timeout: 10000 });
            console.log(`✅ Found username field`);
            
            // Fill username
            await page.fill('input[name="username"]', account.username);
            console.log(`📝 Filled username: ${account.username}`);
            await page.waitForTimeout(1000);
            
            // Fill password
            await page.fill('input[name="password"]', account.password);
            console.log(`📝 Filled password`);
            await page.waitForTimeout(1000);
            
            // Click login button
            await page.click('button[type="submit"]');
            console.log(`🔘 Clicked login button`);
            
            // Wait for response
            console.log(`⏳ Waiting for login response...`);
            await page.waitForTimeout(500000);
            
            // Check if we're still seeing "Don't have an account?" (means login failed)
            const stillNotLoggedIn = await page.locator('text=Don\'t have an account?').isVisible().catch(() => false);
            
            if (stillNotLoggedIn) {
                console.log(`❌ Login failed for ${account.username} - still seeing login form`);
                await this.takeScreenshot(page, browserId, 'login_failed');
                return false;
            } else {
                console.log(`✅ Login successful for ${account.username} - login form disappeared`);
                await this.saveCookiesAfterLogin(page, account.username, browserId);
                return true;
            }

        } catch (error) {
            console.error(`❌ Login failed for ${account.username}:`, error.message);
            await this.takeScreenshot(page, browserId, 'login_error');
            return false;
        }
    }

    /**
     * Save cookies after successful login
     */
    async saveCookiesAfterLogin(page, username, browserId) {
        try {
            const context = page.context();
            await this.cookieManager.saveCookies(username, context);
            await this.takeScreenshot(page, browserId, 'logged_in_fresh');
        } catch (error) {
            console.error(`❌ Failed to save cookies for ${username}:`, error.message);
        }
    }

    /**
     * Take screenshot with descriptive filename
     */
    async takeScreenshot(page, browserId, action) {
        try {
            const timestamp = Date.now();
            const filename = `instagram_${browserId}_${action}_${timestamp}.png`;
            await page.screenshot({ 
                path: filename,
                fullPage: false 
            });
            console.log(`📷 Screenshot saved: ${filename}`);
        } catch (error) {
            console.error(`❌ Failed to take screenshot:`, error.message);
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

            const results = await this.proxyManager.runMultipleBrowsers(proxies, instagramTask, {
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
        await this.proxyManager.closeAll();
    }
}

module.exports = InstagramBot;