const ProxyManager = require('./proxy-manager');
const CookieManager = require('./cookie-manager');

class InstagramBot {
    constructor() {
        this.proxyManager = new ProxyManager();
        this.cookieManager = new CookieManager();
        this.activeSessions = new Map(); // Track active sessions for cleanup
        this.setupGracefulShutdown();
    }

    /**
     * Setup graceful shutdown to save cookies on keyboard interrupt
     */
    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            console.log(`\n🛑 Received ${signal}. Saving cookies and cleaning up...`);

            try {
                // Save cookies for all active sessions
                await this.saveAllActiveCookies();

                // Close all browsers
                await this.cleanup();

                console.log('✅ Cleanup completed successfully');
                process.exit(0);
            } catch (error) {
                console.error('❌ Error during cleanup:', error.message);
                process.exit(1);
            }
        };

        // Handle different interrupt signals
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));  // Ctrl+C
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Termination signal
        process.on('beforeExit', () => gracefulShutdown('beforeExit')); // Before exit
    }

    /**
     * Save cookies for all active sessions
     */
    async saveAllActiveCookies() {
        console.log('💾 Saving cookies for all active sessions...');

        const savePromises = [];

        for (const [browserId, sessionData] of this.activeSessions) {
            if (sessionData.page && sessionData.username) {
                console.log(`💾 Saving cookies for ${sessionData.username} (${browserId})`);

                const savePromise = this.saveCookiesForSession(sessionData.page, sessionData.username, browserId)
                    .catch(error => {
                        console.error(`❌ Failed to save cookies for ${sessionData.username}:`, error.message);
                    });

                savePromises.push(savePromise);
            }
        }

        await Promise.all(savePromises);
        console.log('✅ All cookies saved');
    }

    /**
     * Save cookies for a specific session
     */
    async saveCookiesForSession(page, username, browserId) {
        try {
            const context = page.context();
            await this.cookieManager.saveCookies(username, context);
            console.log(`✅ Cookies saved for ${username} (${browserId})`);
        } catch (error) {
            console.error(`❌ Failed to save cookies for ${username}:`, error.message);
            throw error;
        }
    }    async instagramTask(page, browserId, account = null, options = {}) {
        try {
            console.log(`📸 Starting Instagram automation for ${browserId}...`);

            // Track this session for cleanup
            if (account && account.username) {
                this.activeSessions.set(browserId, {
                    page: page,
                    username: account.username,
                    startTime: Date.now()
                });
            }

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
                    timeout: 30000
                });
                await page.waitForTimeout(3000);

                // Check if we're logged in by looking for "Don't have an account?" text
                const isLoggedIn = await this.cookieManager.checkLoginStatus(page, account.username);

                if (isLoggedIn) {
                    console.log(`✅ ${account.username} already logged in`);
                    await this.takeScreenshot(page, browserId, 'already_logged_in');

                    // If this is just for browsing, don't do anything else
                    if (options.justBrowse) {
                        console.log(`🌐 Browser ready for ${account.username} - you can browse Instagram normally`);
                        // Keep the browser open indefinitely for manual use
                        await this.keepBrowserOpen(page, account.username, browserId);
                        return;
                    }
                } else {
                    console.log(`⚠️ ${account.username} not logged in, attempting login on current page...`);
                    const loginSuccess = await this.loginToInstagram(page, account, browserId);

                    if (loginSuccess && options.justBrowse) {
                        console.log(`🌐 Browser ready for ${account.username} - you can browse Instagram normally`);
                        await this.keepBrowserOpen(page, account.username, browserId);
                        return;
                    }
                }
            } else {
                // Just browse without logging in
                console.log(`👀 Browsing Instagram without login for ${browserId}`);
                await page.goto('https://www.instagram.com/', {
                    waitUntil: 'networkidle',
                    timeout: 60000
                });

                await page.waitForTimeout(3000);
                await this.takeScreenshot(page, browserId, 'no_login');

                if (options.justBrowse) {
                    console.log(`🌐 Browser ready for browsing without login`);
                    await this.keepBrowserOpen(page, 'anonymous', browserId);
                    return;
                }
            }

            // Original behavior - wait for a long time if not just browsing
            if (!options.justBrowse) {
                await page.waitForTimeout(500000);
            }

        } catch (error) {
            console.error(`❌ Instagram automation failed for ${browserId}:`, error.message);
        } finally {
            // Clean up session tracking
            this.removeSession(browserId);
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
            console.log(`🔘 Clicked login button`);            // Wait for response
            console.log(`⏳ Waiting for login response...`);
            await page.waitForTimeout(10000); // Wait 10 seconds

            // Check if we're still seeing "Don't have an account?" (means login failed)
            const stillNotLoggedIn = await page.locator('text=Don\'t have an account?').isVisible().catch(() => false);

            if (stillNotLoggedIn) {
                console.log(`❌ Login failed for ${account.username} - still seeing login form`);
                await this.takeScreenshot(page, browserId, 'login_failed');
                return false;
            } else {
                console.log(`✅ Login successful for ${account.username} - login form disappeared`);
                // Prompt user to press Enter to save cookies
                await this.promptToSaveCookies(page, account.username, browserId);
                return true;
            }

        } catch (error) {
            console.error(`❌ Login failed for ${account.username}:`, error.message);
            await this.takeScreenshot(page, browserId, 'login_error');
            return false;
        }
    }

    /**
     * Prompt user to press Enter to save cookies without closing the browser
     */
    async promptToSaveCookies(page, username, browserId) {
        return new Promise((resolve) => {
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            console.log('👉 Press Enter to save cookies for this account (browser will stay open)...');
            process.stdin.once('data', async () => {
                await this.saveCookiesForSession(page, username, browserId);
                console.log('✅ Cookies saved! You can continue using the browser.');
                resolve();
            });
        });
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
     * Run a single Instagram session with proxy and account
     */
    async runSingleInstagramSession(proxy, account, browserId, options = {}) {
        try {
            console.log(`🚀 Starting single Instagram session for ${browserId}...`);

            const instagramTask = async (page, sessionBrowserId) => {
                await this.instagramTask(page, sessionBrowserId, account, options);
            };

            const results = await this.proxyManager.runMultipleBrowsers([proxy], instagramTask, {
                headless: options.headless || false,
                closeImmediately: options.closeImmediately || false
            });

            return results;

        } catch (error) {
            console.error(`❌ Single Instagram session failed for ${browserId}:`, error.message);
            throw error;
        }
    }

    /**
     * Close all browsers and cleanup
     */
    async cleanup() {
        await this.proxyManager.closeAll();
    }

    /**
     * Manual method to save cookies for emergency situations
     */
    async manualSaveCookies() {
        console.log('🔄 Manual cookie save triggered...');
        await this.saveAllActiveCookies();
    }

    /**
     * Remove session from tracking when it ends
     */
    removeSession(browserId) {
        if (this.activeSessions.has(browserId)) {
            console.log(`🗑️ Removing session ${browserId} from tracking`);
            this.activeSessions.delete(browserId);
        }
    }

    /**
     * Keep browser open for manual use
     */
    async keepBrowserOpen(page, username, browserId) {
        console.log(`🔄 Keeping browser open for ${username} (${browserId})`);
        console.log(`📝 You can now use this browser manually. Cookies will be saved when you press Ctrl+C`);

        // Keep the page active and check for navigation periodically
        let lastUrl = page.url();

        while (true) {
            try {
                await page.waitForTimeout(5000); // Check every 5 seconds

                const currentUrl = page.url();
                if (currentUrl !== lastUrl) {
                    console.log(`🌐 ${username} navigated to: ${currentUrl}`);
                    lastUrl = currentUrl;
                }

                // Check if page is still active
                if (page.isClosed()) {
                    console.log(`❌ Browser for ${username} was closed`);
                    break;
                }

            } catch (error) {
                // Page might have been closed or disconnected
                console.log(`❌ Browser connection lost for ${username}:`, error.message);
                break;
            }
        }
    }
}

module.exports = InstagramBot;