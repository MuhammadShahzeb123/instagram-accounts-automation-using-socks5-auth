const DNSAwareProxy = require('./dns-aware-proxy');
const { chromium } = require('playwright');

/**
 * Complete Streaming Proxy Manager with DNS Resolution
 * Converts SOCKS5 to local HTTP proxy and configures Playwright for streaming
 */

//code
class CompleteStreamingManager {
    constructor(socksConfig) {
        this.socksConfig = socksConfig;
        this.proxy = null;
        this.browser = null;
        this.proxyUrl = null;
        this.mediaRequests = [];
    }

    /**
     * Initialize the proxy and browser
     */
    async initialize() {
        console.log('🚀 Initializing Complete Streaming Manager...');

        // Start DNS-aware proxy
        this.proxy = new DNSAwareProxy(this.socksConfig);
        const proxyInfo = await this.proxy.start();
        this.proxyUrl = proxyInfo.url;

        console.log(`✅ Local HTTP proxy running on: ${this.proxyUrl}`);

        return proxyInfo;
    }

    /**
     * Launch Playwright browser with streaming optimizations
     */
    async launchBrowser(options = {}) {
        if (!this.proxyUrl) {
            throw new Error('Proxy not initialized. Call initialize() first.');
        }

        console.log('🌐 Launching browser with streaming optimizations...');

        const launchOptions = {
            headless: options.headless !== false,
            proxy: {
                server: this.proxyUrl
            },
            args: [
                // Core proxy and networking
                `--proxy-server=${this.proxyUrl}`,
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',

                // DNS and connection optimizations
                '--host-resolver-rules=MAP * ~NOTFOUND , EXCLUDE 127.0.0.1',
                '--dns-prefetch-disable',
                '--disable-background-networking',

                // Media streaming optimizations
                '--autoplay-policy=no-user-gesture-required',
                '--disable-background-media-suspend',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-features=TranslateUI,BlinkGenPropertyTrees',

                // Performance optimizations for streaming
                '--max_old_space_size=4096',
                '--aggressive-cache-discard',
                '--memory-pressure-off',
                '--max-unused-resource-memory-usage-percentage=5',

                // Video codec and hardware acceleration
                '--enable-features=VaapiVideoDecoder',
                '--use-gl=egl',
                '--enable-gpu-rasterization',
                '--enable-zero-copy',

                // Buffer and network optimizations
                '--disk-cache-size=0',
                '--media-cache-size=0',
                '--disable-partial-raster',
                '--disable-skia-runtime-opts',
                '--disable-system-font-check',
                '--disable-features=AudioServiceOutOfProcess',

                // Additional streaming flags
                '--simulate-outdated-no-au="Tue, 31 Dec 2099 23:59:59 GMT"',
                '--disable-ipc-flooding-protection',
                '--disable-hang-monitor',
                '--disable-prompt-on-repost',
                '--no-first-run',
                '--no-default-browser-check',

                ...options.args || []
            ],
            ...options
        };

        this.browser = await chromium.launch(launchOptions);

        console.log('✅ Browser launched successfully');
        return this.browser;
    }

    /**
     * Create a new context with media monitoring
     */
    async createContext(options = {}) {
        if (!this.browser) {
            throw new Error('Browser not launched. Call launchBrowser() first.');
        }

        const context = await this.browser.newContext({
            ignoreHTTPSErrors: true,
            bypassCSP: true,
            ...options
        });

        // Monitor media requests
        context.on('request', (request) => {
            const url = request.url();
            const resourceType = request.resourceType();

            // Track media-related requests
            if (this.isMediaRequest(request)) {
                this.mediaRequests.push({
                    url,
                    type: resourceType,
                    method: request.method(),
                    timestamp: new Date().toISOString()
                });

                console.log(`🎬 Media request: ${resourceType} - ${url}`);
            }
        });

        // Monitor response status
        context.on('response', (response) => {
            if (this.isMediaRequest(response.request())) {
                const status = response.status();
                const url = response.url();

                if (status >= 400) {
                    console.log(`❌ Media request failed: ${status} - ${url}`);
                } else {
                    console.log(`✅ Media request success: ${status} - ${url}`);
                }
            }
        });

        return context;
    }

    /**
     * Check if request is media-related
     */
    isMediaRequest(request) {
        const url = request.url().toLowerCase();
        const resourceType = request.resourceType();

        return (
            resourceType === 'media' ||
            resourceType === 'font' ||
            url.includes('.mp4') ||
            url.includes('.webm') ||
            url.includes('.m4v') ||
            url.includes('.mov') ||
            url.includes('.avi') ||
            url.includes('.mkv') ||
            url.includes('.mp3') ||
            url.includes('.m4a') ||
            url.includes('.wav') ||
            url.includes('.ogg') ||
            url.includes('video') ||
            url.includes('audio') ||
            url.includes('stream') ||
            url.includes('media') ||
            url.includes('youtube.com/watch') ||
            url.includes('instagram.com/p/') ||
            url.includes('tiktok.com')
        );
    }

    /**
     * Test proxy functionality
     */
    async testProxy() {
        console.log('🧪 Testing proxy functionality...');

        if (!this.browser) {
            await this.launchBrowser();
        }

        const context = await this.createContext();
        const page = await context.newPage();

        try {
            // Test 1: Check IP address
            console.log('📍 Checking IP address...');
            await page.goto('https://httpbin.org/ip', { timeout: 30000 });
            const ipInfo = await page.textContent('pre');
            console.log('IP Info:', ipInfo);

            // Test 2: Test DNS resolution
            console.log('🔍 Testing DNS resolution...');
            await page.goto('https://httpbin.org/headers', { timeout: 30000 });
            const headers = await page.textContent('pre');
            console.log('Headers received successfully');

            // Test 3: Test media capability
            console.log('🎥 Testing media streaming capability...');
            await page.goto('https://www.instagram.com', { timeout: 30000 });

            // Wait for media requests
            await page.waitForTimeout(5000);

            const mediaCount = this.mediaRequests.length;
            console.log(`📊 Media requests detected: ${mediaCount}`);

            if (mediaCount > 0) {
                console.log('🎬 Recent media requests:');
                this.mediaRequests.slice(-3).forEach(req => {
                    console.log(`  - ${req.type}: ${req.url.substring(0, 80)}...`);
                });
            }

            return {
                success: true,
                mediaRequests: mediaCount,
                proxyWorking: true
            };

        } catch (error) {
            console.error('❌ Proxy test failed:', error.message);
            return {
                success: false,
                error: error.message,
                mediaRequests: this.mediaRequests.length
            };
        } finally {
            await context.close();
        }
    }

    /**
     * Get proxy statistics
     */
    getStats() {
        const proxyStats = this.proxy ? this.proxy.getStats() : {};

        return {
            proxy: proxyStats,
            media: {
                totalRequests: this.mediaRequests.length,
                recentRequests: this.mediaRequests.slice(-10)
            }
        };
    }

    /**
     * Navigate to a page with streaming optimizations
     */
    async navigateWithStreaming(page, url, options = {}) {
        console.log(`🚀 Navigating to ${url} with streaming optimizations...`);

        const navigationOptions = {
            timeout: 60000,
            waitUntil: 'networkidle',
            ...options
        };

        try {
            await page.goto(url, navigationOptions);

            // Wait for initial media requests
            await page.waitForTimeout(3000);

            // Try to play any video elements
            await page.evaluate(() => {
                const videos = document.querySelectorAll('video');
                videos.forEach(video => {
                    try {
                        video.muted = true;
                        video.play().catch(e => console.log('Video play attempt:', e.message));
                    } catch (e) {
                        console.log('Video play error:', e.message);
                    }
                });
            });

            // Wait for media to load
            await page.waitForTimeout(2000);

            console.log('✅ Page loaded with streaming optimizations');
            return true;

        } catch (error) {
            console.error(`❌ Navigation failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Clean shutdown
     */
    async cleanup() {
        console.log('🧹 Cleaning up Complete Streaming Manager...');

        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }

        if (this.proxy) {
            await this.proxy.stop();
            this.proxy = null;
        }

        console.log('✅ Cleanup completed');
    }
}

module.exports = CompleteStreamingManager;
