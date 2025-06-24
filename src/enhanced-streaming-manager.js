const SocksToHttpProxy = require('./socks-to-http-proxy');
const { chromium } = require('playwright');

/**
 * Enhanced Streaming Proxy Manager
 *
 * This manager creates a proper HTTP proxy from SOCKS5 for reliable video streaming
 * with proper DNS resolution and media optimization.
 */
class EnhancedStreamingManager {
    constructor() {
        this.socksToHttpProxy = new SocksToHttpProxy();
        this.browser = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the enhanced streaming proxy
     * @param {string} proxyString - Format: socks5:host:port:username:password
     */
    async initialize(proxyString) {
        try {
            console.log('🚀 Initializing Enhanced Streaming Manager...');

            // Parse proxy string
            const proxyConfig = this.parseProxyString(proxyString);
            console.log(`🔧 Converting SOCKS5 to HTTP proxy: ${proxyConfig.host}:${proxyConfig.port}`);

            // Start SOCKS-to-HTTP proxy converter
            const result = await this.socksToHttpProxy.start(proxyConfig);

            if (!result.success) {
                throw new Error('Failed to start HTTP proxy converter');
            }

            this.httpProxyUrl = result.proxyUrl;
            this.isInitialized = true;

            console.log('✅ Enhanced streaming proxy initialized successfully');
            console.log(`🔗 Local HTTP Proxy: ${this.httpProxyUrl}`);

            return {
                success: true,
                httpProxyUrl: this.httpProxyUrl,
                port: result.port
            };

        } catch (error) {
            console.error('❌ Failed to initialize enhanced streaming proxy:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Parse SOCKS5 proxy string
     */
    parseProxyString(proxyString) {
        const parts = proxyString.split(':');
        if (parts.length !== 5 || parts[0] !== 'socks5') {
            throw new Error('Invalid proxy format. Expected: socks5:host:port:username:password');
        }

        return {
            host: parts[1],
            port: parseInt(parts[2]),
            username: parts[3],
            password: parts[4]
        };
    }

    /**
     * Launch browser optimized for streaming with the HTTP proxy
     */
    async launchStreamingBrowser(options = {}) {
        if (!this.isInitialized) {
            throw new Error('Enhanced streaming manager not initialized');
        }

        try {
            console.log('🌐 Launching streaming-optimized browser...');

            // Enhanced browser arguments for streaming
            const browserArgs = [
                // Use our HTTP proxy
                `--proxy-server=${this.httpProxyUrl}`,

                // DNS and network optimization
                '--enable-async-dns',
                '--enable-simple-cache-backend',
                '--aggressive-cache-discard',
                '--enable-tcp-fast-open',

                // Media and video optimization
                '--enable-features=VaapiVideoDecoder,VaapiVideoEncoder',
                '--enable-accelerated-video-decode',
                '--enable-accelerated-video-encode',
                '--enable-gpu-rasterization',
                '--enable-zero-copy',
                '--use-gl=swiftshader',
                '--force-video-overlays',

                // Autoplay and media policies
                '--autoplay-policy=no-user-gesture-required',
                '--disable-background-media-suspend',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',

                // Disable problematic features
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',

                // Network and proxy optimization
                '--ignore-certificate-errors',
                '--ignore-ssl-errors-on-localhost',
                '--disable-proxy-certificate-handler',
                '--proxy-bypass-list=<-loopback>',

                // Performance optimization
                '--max-old-space-size=4096',
                '--memory-pressure-off',
                '--enable-experimental-web-platform-features',

                // User agent
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ];

            this.browser = await chromium.launch({
                headless: options.headless || false,
                args: browserArgs,
                timeout: 60000
            });

            console.log('✅ Streaming browser launched successfully');
            return this.browser;

        } catch (error) {
            console.error('❌ Failed to launch streaming browser:', error.message);
            throw error;
        }
    }

    /**
     * Create optimized page context for streaming
     */
    async createStreamingPage() {
        if (!this.browser) {
            throw new Error('Browser not launched');
        }

        try {
            console.log('📄 Creating streaming-optimized page...');

            const context = await this.browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

                // Enhanced permissions for media
                permissions: ['camera', 'microphone'],

                // Video codec and media support
                extraHTTPHeaders: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                },

                bypassCSP: true,
                ignoreHTTPSErrors: true
            });

            const page = await context.newPage();

            // Set up request interception for media optimization
            await this.setupMediaOptimization(page);

            console.log('✅ Streaming page created successfully');
            return { page, context };

        } catch (error) {
            console.error('❌ Failed to create streaming page:', error.message);
            throw error;
        }
    }

    /**
     * Setup media-specific optimizations
     */
    async setupMediaOptimization(page) {
        try {
            console.log('🎥 Setting up media optimizations...');

            // Route requests for better media handling
            await page.route('**/*', async (route, request) => {
                const url = request.url();
                const resourceType = request.resourceType();

                // Log media requests
                if (this.isMediaRequest(url, resourceType)) {
                    console.log(`🎬 Media request: ${url.split('/').pop()}`);
                }

                // Add headers for media requests
                const headers = { ...request.headers() };

                if (this.isMediaRequest(url, resourceType)) {
                    headers['Range'] = headers['Range'] || 'bytes=0-';
                    headers['Accept-Ranges'] = 'bytes';
                    headers['Cache-Control'] = 'no-cache';
                }

                await route.continue({ headers });
            });

            // Inject media enhancement script
            await page.addInitScript(() => {
                // Override media policies
                Object.defineProperty(navigator, 'mediaDevices', {
                    writable: true,
                    value: {
                        getUserMedia: () => Promise.resolve({}),
                        enumerateDevices: () => Promise.resolve([])
                    }
                });

                // Enhanced video loading
                const originalPlay = HTMLMediaElement.prototype.play;
                HTMLMediaElement.prototype.play = function() {
                    this.autoplay = true;
                    this.preload = 'auto';
                    this.controls = true;
                    return originalPlay.call(this);
                };

                // Auto-enable video elements
                document.addEventListener('DOMContentLoaded', () => {
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            mutation.addedNodes.forEach((node) => {
                                if (node.tagName === 'VIDEO') {
                                    node.autoplay = true;
                                    node.preload = 'auto';
                                    node.controls = true;
                                    node.muted = false;
                                    console.log('🎥 Video element enhanced for streaming');
                                }
                            });
                        });
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                });
            });

            console.log('✅ Media optimizations applied');

        } catch (error) {
            console.error('❌ Failed to setup media optimization:', error.message);
        }
    }

    /**
     * Check if request is media-related
     */
    isMediaRequest(url, resourceType) {
        const mediaTypes = ['media', 'xhr', 'fetch'];
        const mediaExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.m3u8', '.mpd', '.m4a', '.mp3'];
        const mediaKeywords = ['video', 'audio', 'stream', 'media', 'player'];

        return mediaTypes.includes(resourceType) ||
               mediaExtensions.some(ext => url.includes(ext)) ||
               mediaKeywords.some(keyword => url.toLowerCase().includes(keyword));
    }

    /**
     * Test streaming functionality
     */
    async testStreaming(page) {
        try {
            console.log('🧪 Testing streaming functionality...');

            // Test 1: IP verification
            console.log('📍 Checking IP address...');
            await page.goto('https://httpbin.org/ip', { waitUntil: 'domcontentloaded', timeout: 15000 });
            const ipInfo = await page.textContent('body');
            const ipData = JSON.parse(ipInfo);
            console.log(`✅ Current IP: ${ipData.origin}`);

            // Test 2: Video streaming capability
            console.log('🎬 Testing video streaming...');
            const testVideo = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            await page.goto(testVideo, { waitUntil: 'domcontentloaded', timeout: 20000 });

            await page.waitForTimeout(3000);

            const videoStatus = await page.evaluate(() => {
                const video = document.querySelector('video');
                return video ? {
                    found: true,
                    readyState: video.readyState,
                    networkState: video.networkState,
                    canPlay: video.readyState >= 2,
                    duration: video.duration || 0,
                    currentTime: video.currentTime || 0
                } : { found: false };
            });

            if (videoStatus.found && videoStatus.canPlay) {
                console.log('✅ Video streaming test PASSED');
                console.log(`📊 Duration: ${videoStatus.duration}s, Ready: ${videoStatus.readyState}`);
                return true;
            } else if (videoStatus.found) {
                console.log('⚠️ Video found but not ready');
                console.log(`📊 Ready: ${videoStatus.readyState}, Network: ${videoStatus.networkState}`);
                return false;
            } else {
                console.log('❌ No video element found');
                return false;
            }

        } catch (error) {
            console.error('❌ Streaming test failed:', error.message);
            return false;
        }
    }

    /**
     * Run a streaming session
     */
    async runStreamingSession(task, options = {}) {
        try {
            if (!this.isInitialized) {
                throw new Error('Manager not initialized');
            }

            const browser = await this.launchStreamingBrowser(options);
            const { page, context } = await this.createStreamingPage();

            // Run streaming test
            const streamingWorks = await this.testStreaming(page);

            if (!streamingWorks) {
                console.warn('⚠️ Video streaming test failed, but continuing...');
            }

            // Execute custom task
            if (typeof task === 'function') {
                console.log('🎯 Executing custom streaming task...');
                await task(page, context, browser);
            } else {
                // Default task: keep browser open
                const duration = options.duration || 300; // 5 minutes default
                console.log(`⏳ Keeping browser open for ${duration} seconds...`);
                console.log('🎥 Browser is ready for manual video streaming tests!');
                await page.waitForTimeout(duration * 1000);
            }

            await browser.close();
            console.log('✅ Streaming session completed');

        } catch (error) {
            console.error('❌ Streaming session failed:', error.message);
            throw error;
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            console.log('🧹 Cleaning up enhanced streaming manager...');

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }

            await this.socksToHttpProxy.stop();
            this.isInitialized = false;

            console.log('✅ Cleanup completed');

        } catch (error) {
            console.error('❌ Cleanup error:', error.message);
        }
    }

    /**
     * Get status information
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            httpProxyUrl: this.httpProxyUrl || null,
            proxyStatus: this.socksToHttpProxy.getStatus(),
            browserLaunched: !!this.browser
        };
    }
}

module.exports = EnhancedStreamingManager;
