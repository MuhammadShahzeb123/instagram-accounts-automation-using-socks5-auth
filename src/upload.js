const ProxyManager = require('./proxy-manager');
const StreamingProxyManager = require('./streaming-proxy-manager');
const HybridProxyManager = require('./hybrid-proxy-manager');
const SimplifiedStreamingManager = require('./simplified-streaming-manager');
const EnhancedStreamingManager = require('./enhanced-streaming-manager');
const StreamingDiagnostics = require('./streaming-diagnostics');
const CookieManager = require('./cookie-manager');

class UploadManager2 {    constructor() {
        this.proxyManager = new ProxyManager();
        this.streamingManager = new StreamingProxyManager();
        this.hybridManager = new HybridProxyManager();
        this.simplifiedManager = new SimplifiedStreamingManager();
        this.enhancedManager = new EnhancedStreamingManager();
        this.streamingDiagnostics = new StreamingDiagnostics();
        this.cookieManager = new CookieManager();
        this.useStreamingMode = true; // Enable streaming by default
        this.useHybridMode = false; // New hybrid mode option
        this.useSimplifiedMode = false; // New simplified mode option
    }

    /**
     * Get proxy/account pairs from main.js configuration
     */
    getProxyAccountPairs() {
        return [
            {
                proxy: 'socks5:134.195.155.40:9330:P1yUB7:N1ZT9F',
                account: {
                    username: 'alloyflirtt',
                    password: 'ISP2025$'
                }
            },
            {
                proxy: 'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F',
                account: {
                    username: 'flirtsync',
                    password: 'ISP2025$'
                }
            },            {
                proxy: 'socks5:134.195.155.182:9136:P1yUB7:N1ZT9F',
                account: {
                    username: 'silentflirtt',
                    password: 'ISP2025$'
                }
            },
            {
                proxy: 'socks5:38.153.57.54:9458:P1yUB7:N1ZT9F',
                account: {
                    username: 'aerorizzz',
                    password: 'ISP2025$'
                }
            },
            {
                proxy: 'socks5:38.153.31.217:9794:P1yUB7:N1ZT9F',
                account: {
                    username: 'miragelines',
                    password: 'ISP2025$'
                }
            }
        ];
    }    /**
     * Spawn browser with specific account index (with streaming support)
     * @param {number} accountIndex - Index of account to use (1-based)
     * @param {Object} options - Additional options
     */
    async spawnBrowser(accountIndex, options = {}) {
        const allPairs = this.getProxyAccountPairs();

        if (accountIndex < 1 || accountIndex > allPairs.length) {
            console.error(`❌ Invalid account index: ${accountIndex}`);
            console.error(`📊 Available accounts: 1-${allPairs.length}`);
            this.listAvailableAccounts();
            return;
        }

        const selectedPair = allPairs[accountIndex - 1]; // Convert to 0-based index
        const { proxy, account } = selectedPair;

        console.log(`🚀 Starting ${this.useStreamingMode ? 'streaming' : 'standard'} browser with account #${accountIndex}`);
        console.log(`👤 Account: ${account.username}`);
        console.log(`🌐 Proxy: ${proxy.split(':')[1]}:${proxy.split(':')[2]}`);
        console.log('');

        try {
            // Run diagnostics if requested
            if (options.runDiagnostics) {
                console.log('🔍 Running streaming diagnostics first...');
                await this.streamingDiagnostics.runFullStreamingDiagnostics(proxy, account);
                console.log('');
            }            // Start browser with proxy and cookies
            if (this.useSimplifiedMode) {
                await this.startSimplifiedBrowserWithProxyAndCookies(proxy, account, options);
            } else if (this.useHybridMode) {
                await this.startHybridBrowserWithProxyAndCookies(proxy, account, options);
            } else if (this.useStreamingMode) {
                await this.startStreamingBrowserWithProxyAndCookies(proxy, account, options);
            } else {
                await this.startBrowserWithProxyAndCookies(proxy, account);
            }

        } catch (error) {
            console.error('❌ Error starting browser:', error.message);

            // Try fallback to standard mode if streaming fails
            if (this.useStreamingMode && !options.streamingOnly) {
                console.log('🔄 Streaming mode failed, trying standard mode...');
                this.useStreamingMode = false;
                await this.startBrowserWithProxyAndCookies(proxy, account);
            }        } finally {
            if (this.useSimplifiedMode) {
                await this.simplifiedManager.cleanup();
            } else if (this.useHybridMode) {
                await this.hybridManager.cleanup();
            } else if (this.useStreamingMode) {
                await this.streamingManager.closeAll();
            } else {
                await this.proxyManager.closeAll();
            }
        }
    }    /**
     * Start simplified streaming browser (RECOMMENDED)
     */
    async startSimplifiedBrowserWithProxyAndCookies(proxy, account, options = {}) {
        try {
            console.log('🔧 Initializing Simplified Streaming Manager...');

            // Initialize simplified streaming manager
            const result = await this.simplifiedManager.initialize(proxy);

            if (!result.success) {
                throw new Error(`Simplified streaming initialization failed: ${result.error}`);
            }

            console.log('✅ Simplified streaming system initialized');
            console.log(`🔗 HTTP Proxy: ${result.proxyUrl}`);

            // Launch browser with optimizations
            const { browser, page } = await this.simplifiedManager.launchBrowser({
                headless: false
            });

            // Load cookies for this account
            await this.cookieManager.loadCookies(account.username, page);
            console.log(`🍪 Cookies loaded for ${account.username}`);

            console.log(`✅ Simplified streaming browser started for ${account.username}`);

            // Test Instagram access
            try {
                console.log('📱 Testing Instagram access...');
                await this.simplifiedManager.testInstagramAccess(page);
            } catch (error) {
                console.warn('⚠️ Instagram test failed:', error.message);
            }

            // Test video streaming
            try {
                console.log('🎬 Testing video streaming capability...');
                const videoWorking = await this.simplifiedManager.testVideoStreaming(page);

                if (videoWorking) {
                    console.log('🎉 SUCCESS! Video streaming is working through SOCKS5 proxy!');
                } else {
                    console.log('⚠️ Video streaming test inconclusive, but browser is ready');
                }
            } catch (error) {
                console.warn('⚠️ Video streaming test failed:', error.message);
            }

            // Keep browser open
            const duration = options.duration || 5000; // Default 5000 seconds
            console.log(`⏳ Keeping simplified streaming browser open for ${duration} seconds...`);
            console.log('🎥 Video streaming should now work! Try Instagram, YouTube, TikTok, etc.');
            console.log('🔄 All traffic is routed through SOCKS5 with streaming optimizations');

            await page.waitForTimeout(duration * 1000);

            console.log(`✅ ${duration} seconds completed for ${account.username}`);

            // Cleanup
            await browser.close();
            await this.simplifiedManager.cleanup();

        } catch (error) {
            console.error('❌ Simplified streaming browser error:', error.message);
            await this.simplifiedManager.cleanup();
            throw error;
        }
    }

    /**
     * Start hybrid browser with selective proxy routing for media content
     */
    async startHybridBrowserWithProxyAndCookies(proxy, account, options = {}) {
        try {
            console.log('🔧 Initializing Hybrid Proxy Manager...');

            // Parse proxy string to configuration object
            const proxyConfig = this.parseProxyString(proxy);

            // Initialize hybrid proxy manager
            const result = await this.hybridManager.initialize(proxyConfig);

            if (!result.success) {
                throw new Error(`Hybrid proxy initialization failed: ${result.error}`);
            }

            console.log('✅ Hybrid proxy system initialized');
            console.log(`🔗 Local proxy: ${result.localProxyUrl}`);
              // Launch browser with hybrid proxy
            const { chromium } = require('playwright');
            const browserOptions = {
                headless: false,
                ...this.hybridManager.getBrowserLaunchOptions()
            };

            console.log('🌐 Launching browser with hybrid proxy...');
            const browser = await chromium.launch(browserOptions);
            const page = await browser.newPage();

            // Set viewport and user agent
            await page.setViewport({ width: 1366, height: 768 });
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Setup request interception for media optimization
            await this.hybridManager.setupRequestInterception(page);

            // Load cookies for this account
            await this.cookieManager.loadCookies(account.username, page);
            console.log(`🍪 Cookies loaded for ${account.username}`);

            console.log(`✅ Hybrid browser started for ${account.username}`);

            // Test Instagram access with video streaming
            try {
                console.log('📱 Testing Instagram access with hybrid proxy...');
                await page.goto('https://www.instagram.com', {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                // Wait for page to load
                await page.waitForTimeout(5000);

                // Test video streaming capability
                console.log('🎥 Testing video streaming...');
                await this.testVideoStreaming(page);

                console.log('✅ Instagram loaded successfully with hybrid proxy');

            } catch (error) {
                console.warn('⚠️ Instagram access test failed:', error.message);
            }

            // Keep browser open
            const duration = options.duration || 5000; // Default 5000 seconds
            console.log(`⏳ Keeping hybrid browser open for ${duration} seconds...`);
            console.log('🎥 Video streaming should now work through the hybrid proxy!');
            console.log('🔄 Media traffic routes through HTTP proxy, regular traffic through SOCKS5');

            await page.waitForTimeout(duration * 1000);

            console.log(`✅ ${duration} seconds completed for ${account.username}`);

            // Cleanup
            await browser.close();
            await this.hybridManager.cleanup();

        } catch (error) {
            console.error('❌ Hybrid browser error:', error.message);
            await this.hybridManager.cleanup();
            throw error;
        }
    }

    /**
     * Test video streaming functionality
     */
    async testVideoStreaming(page) {
        try {
            // Try to navigate to a direct video URL
            const testVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

            console.log('🎬 Testing direct video streaming...');
            await page.goto(testVideoUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });

            // Check if video loaded
            const videoLoaded = await page.evaluate(() => {
                const video = document.querySelector('video');
                return video && video.readyState >= 2; // HAVE_CURRENT_DATA
            });

            if (videoLoaded) {
                console.log('✅ Direct video streaming test PASSED');
                return true;
            } else {
                console.log('❌ Direct video streaming test FAILED');
                return false;
            }

        } catch (error) {
            console.log('❌ Video streaming test failed:', error.message);
            return false;
        }
    }

    /**
     * Parse proxy string into configuration object
     */
    parseProxyString(proxyString) {
        // Parse: socks5:host:port:username:password
        const parts = proxyString.split(':');
        if (parts.length !== 5) {
            throw new Error('Invalid proxy format. Expected: socks5:host:port:username:password');
        }

        return {
            host: parts[1],
            port: parseInt(parts[2]),
            auth: {
                username: parts[3],
                password: parts[4]
            }
        };
    }

    /**
     * Start streaming browser with proxy and load cookies
     */
    async startStreamingBrowserWithProxyAndCookies(proxy, account, options = {}) {
        const browserTask = async (page, browserId, context) => {
            console.log(`✅ Streaming browser started for ${account.username}`);

            // Load cookies for this account
            await this.cookieManager.loadCookies(account.username, context);
            console.log(`🍪 Cookies loaded for ${account.username}`);

            // Navigate to Instagram to test streaming
            try {
                console.log('📱 Testing Instagram access with streaming support...');
                await page.goto('https://www.instagram.com', {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });

                // Wait for the page to load and check for video elements
                await page.waitForTimeout(3000);

                const hasVideoElements = await page.evaluate(() => {
                    const videos = document.querySelectorAll('video');
                    return videos.length > 0;
                });

                if (hasVideoElements) {
                    console.log('🎥 Video elements detected - streaming should work!');
                } else {
                    console.log('📷 No video elements found yet, but page loaded successfully');
                }

                // Set up video streaming optimizations
                await page.addInitScript(() => {
                    // Enable autoplay for Instagram videos
                    document.addEventListener('DOMContentLoaded', () => {
                        const observer = new MutationObserver((mutations) => {
                            mutations.forEach((mutation) => {
                                mutation.addedNodes.forEach((node) => {
                                    if (node.tagName === 'VIDEO') {
                                        node.autoplay = true;
                                        node.muted = false;
                                        node.controls = true;
                                        node.preload = 'auto';
                                        console.log('🎥 Video element optimized for streaming');
                                    }
                                });
                            });
                        });
                        observer.observe(document.body, { childList: true, subtree: true });
                    });
                });

            } catch (error) {
                console.warn('⚠️ Instagram access test failed:', error.message);
            }

            // Keep browser open with streaming capabilities
            const duration = options.duration || 5000; // Default 5000 seconds
            console.log(`⏳ Keeping streaming browser open for ${duration} seconds...`);
            console.log('🎥 You can now stream videos on any platform with this browser!');
            console.log('🔄 Streaming optimizations are active');

            await page.waitForTimeout(duration * 1000);

            console.log(`✅ ${duration} seconds completed for ${account.username}`);
        };

        await this.streamingManager.runMultipleStreamingBrowsers([proxy], browserTask, {
            headless: false,
            closeImmediately: false,
            ...options
        });
    }

    /**
     * Start browser with proxy and load cookies (standard mode)
     */
    async startBrowserWithProxyAndCookies(proxy, account) {
        const browserTask = async (page, browserId) => {
            console.log(`✅ Browser started for ${account.username}`);

            // Load cookies for this account
            const context = page.context();
            await this.cookieManager.loadCookies(account.username, context);
            console.log(`🍪 Cookies loaded for ${account.username}`);

            // Keep browser open for exactly 5000 seconds
            console.log(`⏳ Keeping browser open for 5000 seconds...`);
            console.log('🔄 You can use this browser manually with loaded cookies and proxy');

            await page.waitForTimeout(5000000); // 5000 seconds = 5,000,000 milliseconds

            console.log(`✅ 5000 seconds completed for ${account.username}`);
        };

        await this.proxyManager.runMultipleBrowsers([proxy], browserTask, {
            headless: false,
            closeImmediately: false
        });
    }    /**
     * List all available accounts
     */
    listAvailableAccounts() {
        const pairs = this.getProxyAccountPairs();
        console.log('\n📋 Available accounts:');
        pairs.forEach((pair, index) => {
            console.log(`  ${index + 1}. ${pair.account.username} (${pair.proxy.split(':')[1]}:${pair.proxy.split(':')[2]})`);
        });
        console.log('');
    }

    /**
     * Test streaming for specific account
     */
    async testStreaming(accountIndex) {
        console.log('🎥 Testing streaming capabilities...\n');
        return await this.streamingDiagnostics.quickStreamingTest(accountIndex, this.getProxyAccountPairs());
    }    /**
     * Enable/disable streaming mode
     */
    setStreamingMode(enabled) {
        this.useStreamingMode = enabled;
        this.useHybridMode = false; // Disable hybrid when setting streaming
        console.log(`🎥 Streaming mode ${enabled ? 'enabled' : 'disabled'}`);
    }    /**
     * Enable/disable hybrid proxy mode
     */
    setHybridMode(enabled) {
        this.useHybridMode = enabled;
        this.useStreamingMode = false; // Disable streaming when setting hybrid
        this.useSimplifiedMode = false; // Disable simplified when setting hybrid
        console.log(`🔧 Hybrid proxy mode ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Enable/disable simplified streaming mode (RECOMMENDED)
     */
    setSimplifiedMode(enabled) {
        this.useSimplifiedMode = enabled;
        this.useStreamingMode = false; // Disable other modes
        this.useHybridMode = false;
        console.log(`🚀 Simplified streaming mode ${enabled ? 'enabled' : 'disabled'}`);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    // Check if first argument is a number (old style usage)
    const firstArg = args[0];
    const firstArgAsNumber = parseInt(firstArg);

    if (!isNaN(firstArgAsNumber) && firstArgAsNumber > 0) {
        // Old style: npm run upload 1
        const uploadManager = new UploadManager2();
        await uploadManager.spawnBrowser(firstArgAsNumber);
        return;
    }

    // New style with commands
    const command = args[0];
    const accountIndex = parseInt(args[1]);

    const uploadManager = new UploadManager2();

    // Handle different commands
    if (command === 'test' && !isNaN(accountIndex)) {
        // Test streaming for specific account
        await uploadManager.testStreaming(accountIndex);
        return;    } else if (command === 'standard' && !isNaN(accountIndex)) {
        // Force standard (non-streaming) mode
        uploadManager.setStreamingMode(false);
        await uploadManager.spawnBrowser(accountIndex);
        return;
    } else if (command === 'simplified' && !isNaN(accountIndex)) {
        // Use simplified streaming mode (RECOMMENDED for video)
        uploadManager.setSimplifiedMode(true);
        await uploadManager.spawnBrowser(accountIndex, {
            duration: 300 // 5 minutes for testing
        });
        return;
    } else if (command === 'hybrid' && !isNaN(accountIndex)) {
        // Use hybrid proxy mode for better video streaming
        uploadManager.setHybridMode(true);
        await uploadManager.spawnBrowser(accountIndex, {
            duration: 300 // 5 minutes for testing
        });
        return;
    } else if (command === 'diagnostics' && !isNaN(accountIndex)) {
        // Run with full diagnostics
        await uploadManager.spawnBrowser(accountIndex, {
            runDiagnostics: true,
            duration: 300  // 5 minutes for testing
        });
        return;
    }    // Show usage if no valid command
    console.error('❌ Usage options:');
    console.error('📝 npm run upload <account_index>             - Start streaming browser');
    console.error('📝 npm run upload test <account_index>        - Test streaming capabilities');
    console.error('📝 npm run upload simplified <account_index>  - Use simplified streaming (BEST)');
    console.error('📝 npm run upload standard <account_index>    - Use standard (non-streaming) mode');
    console.error('📝 npm run upload hybrid <account_index>      - Use hybrid proxy mode');
    console.error('📝 npm run upload diagnostics <account_index> - Run with full diagnostics');
    console.error('');
    console.error('🎯 Examples:');
    console.error('   npm run upload simplified 1          - RECOMMENDED: Simplified streaming for account 1');
    console.error('   npm run upload 2                     - Start streaming browser for account 2');
    console.error('   npm run upload test 1                - Test streaming for account 1');
    console.error('   npm run upload diagnostics 3         - Run diagnostics and start browser');
    console.error('');
    console.error('📊 Available accounts: 1-5');
    console.error('');
    console.error('💡 TIP: Use "simplified" mode for best video streaming performance!');

    uploadManager.listAvailableAccounts();
    process.exit(1);
}

// Handle graceful shutdown
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = UploadManager2;
