const { chromium } = require('playwright');
const ProxyChain = require('proxy-chain');

/**
 * Simplified Streaming Proxy Manager
 *
 * This approach uses Playwright's request interception to handle media content differently
 * while still using the same SOCKS5 proxy for all traffic
 */
class SimplifiedStreamingManager {
    constructor() {
        this.proxyUrl = null;
        this.browser = null;
        this.originalProxyString = null;
    }

    /**
     * Parse SOCKS5 proxy string format: socks5:IP:PORT:USER:PASS
     */
    // Improved parsing with validation
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
     * Initialize the proxy system
     */
    async initialize(proxyString) {
        try {
            console.log('🔧 Initializing Simplified Streaming Manager...');

            const proxyConfig = this.parseProxyString(proxyString);
            this.originalProxyString = proxyString;

            // Create HTTP proxy from SOCKS5 using ProxyChain
            const socksUrl = `socks5://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.hostname}:${proxyConfig.port}`;

            console.log(`🌐 Creating HTTP proxy from SOCKS5: ${proxyConfig.hostname}:${proxyConfig.port}`);

            // Use ProxyChain to create an HTTP proxy that forwards to SOCKS5
            this.proxyUrl = await ProxyChain.anonymizeProxy(socksUrl);

            console.log(`✅ HTTP proxy created: ${this.proxyUrl}`);
            console.log(`🎯 Ready to launch browser with streaming optimizations`);

            return {
                success: true,
                proxyUrl: this.proxyUrl,
                message: 'Simplified streaming manager initialized successfully'
            };

        } catch (error) {
            console.error('❌ Failed to initialize simplified streaming manager:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Launch browser with streaming optimizations
     */
    async launchBrowser(options = {}) {
        try {
            if (!this.proxyUrl) {
                throw new Error('Proxy not initialized. Call initialize() first.');
            }

            console.log('🚀 Launching browser with streaming optimizations...');

            // Enhanced browser args for video streaming
            const browserArgs = [
                // Proxy settings
                `--proxy-server=${this.proxyUrl}`,

                // Basic security and performance
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',

                // Video streaming optimization
                '--enable-features=VaapiVideoDecoder',
                '--enable-features=VaapiVideoEncoder',
                '--use-gl=swiftshader',
                '--enable-accelerated-video-decode',
                '--enable-accelerated-video-encode',
                '--enable-gpu-rasterization',
                '--enable-zero-copy',

                // Network optimization
                '--aggressive-cache-discard',
                '--enable-tcp-fast-open',
                '--enable-async-dns',
                '--enable-simple-cache-backend',
                '--enable-features=NetworkService',

                // Media optimization
                '--autoplay-policy=no-user-gesture-required',
                '--disable-background-media-suspend',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',
                '--disable-background-timer-throttling',

                // Reduce restrictions
                '--disable-features=VizDisplayCompositor',
                '--disable-ipc-flooding-protection',
                '--ignore-certificate-errors',
                '--ignore-ssl-errors-on-localhost',

                // User agent
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            ];

            // Launch browser
            this.browser = await chromium.launch({
                headless: options.headless || false,
                args: browserArgs,
                timeout: 60000
            });

            const page = await this.browser.newPage();

            // Set viewport
            await page.setViewportSize({ width: 1366, height: 768 });

            // Setup request interception for media optimization
            await this.setupMediaOptimization(page);

            console.log('✅ Browser launched successfully with streaming optimizations');

            return { browser: this.browser, page };

        } catch (error) {
            console.error('❌ Failed to launch browser:', error.message);
            throw error;
        }
    }

    /**
     * Setup media optimization through request interception
     */
    async setupMediaOptimization(page) {
        try {
            console.log('🎬 Setting up media optimization...');

            // Enable request interception
            await page.route('**/*', async (route, request) => {
                try {
                    const url = request.url();
                    const resourceType = request.resourceType();

                    // Check if this is a media request
                    const isMediaRequest = this.isMediaRequest(url, resourceType, request.headers());

                    if (isMediaRequest) {
                        console.log(`🎥 Media request detected: ${url.split('/').pop()}`);

                        // Add headers optimized for media streaming
                        const headers = {
                            ...request.headers(),
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Accept-Ranges': 'bytes',
                            'Connection': 'keep-alive'
                        };

                        // Add Range header if not present for video requests
                        if (!headers['range'] && (url.includes('.mp4') || url.includes('.webm'))) {
                            headers['Range'] = 'bytes=0-';
                        }

                        await route.continue({ headers });
                    } else {
                        // Continue normal requests without modification
                        await route.continue();
                    }
                } catch (error) {
                    console.error('❌ Request interception error:', error.message);
                    try {
                        await route.continue();
                    } catch (continueError) {
                        console.error('❌ Failed to continue request:', continueError.message);
                    }
                }
            });

            // Add media-specific page scripts
            await page.addInitScript(() => {
                // Override media policies for better streaming
                Object.defineProperty(HTMLMediaElement.prototype, 'play', {
                    writable: true,
                    value: function() {
                        this.autoplay = true;
                        this.preload = 'auto';
                        this.crossOrigin = 'anonymous';
                        return Promise.resolve();
                    }
                });

                // Monitor video elements
                document.addEventListener('DOMContentLoaded', () => {
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            mutation.addedNodes.forEach((node) => {
                                if (node.tagName === 'VIDEO') {
                                    console.log('🎥 Video element detected, optimizing...');
                                    node.autoplay = true;
                                    node.preload = 'auto';
                                    node.crossOrigin = 'anonymous';
                                    node.controls = true;
                                }
                            });
                        });
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                });
            });

            console.log('✅ Media optimization setup complete');

        } catch (error) {
            console.error('❌ Failed to setup media optimization:', error.message);
            throw error;
        }
    }

    /**
     * Check if request is for media content
     */
    isMediaRequest(url, resourceType, headers) {
        // Check resource type
        if (resourceType === 'media') {
            return true;
        }

        // Check URL for media extensions
        const mediaExtensions = [
            '.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv',
            '.m4v', '.3gp', '.ts', '.m3u8', '.mpd', '.m4a', '.mp3', '.wav'
        ];

        const urlLower = url.toLowerCase();
        if (mediaExtensions.some(ext => urlLower.includes(ext))) {
            return true;
        }

        // Check accept headers
        const accept = headers['accept'] || '';
        if (accept.includes('video/') || accept.includes('audio/')) {
            return true;
        }

        // Check for streaming-related keywords
        const streamingKeywords = ['video', 'stream', 'media', 'player', 'manifest'];
        if (streamingKeywords.some(keyword => urlLower.includes(keyword))) {
            return true;
        }

        // Check for known media hosts
        const mediaHosts = [
            'instagram.com', 'cdninstagram.com', 'fbcdn.net',
            'youtube.com', 'googlevideo.com', 'ytimg.com',
            'tiktok.com', 'tiktokcdn.com'
        ];

        if (mediaHosts.some(host => urlLower.includes(host))) {
            return true;
        }

        return false;
    }

    /**
     * Test video streaming capability
     */
    async testVideoStreaming(page) {
        try {
            console.log('🎬 Testing video streaming capability...');

            // Test 1: Direct MP4 video
            console.log('📹 Test 1: Direct MP4 video...');
            const testVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

            await page.goto(testVideoUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 20000
            });

            await page.waitForTimeout(3000);

            const videoTest = await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video) {
                    return {
                        found: true,
                        readyState: video.readyState,
                        duration: video.duration || 0,
                        canPlay: video.readyState >= 2,
                        currentTime: video.currentTime
                    };
                }
                return { found: false };
            });

            if (videoTest.found && videoTest.canPlay) {
                console.log('✅ Direct video test PASSED');
                console.log(`📊 Duration: ${videoTest.duration}s, Ready state: ${videoTest.readyState}`);
                return true;
            } else if (videoTest.found) {
                console.log('⚠️ Video found but not ready to play');
                console.log(`📊 Ready state: ${videoTest.readyState}`);
                return false;
            } else {
                console.log('❌ No video element found');
                return false;
            }

        } catch (error) {
            console.error('❌ Video streaming test failed:', error.message);
            return false;
        }
    }

    /**
     * Test Instagram access
     */
    async testInstagramAccess(page) {
        try {
            console.log('📱 Testing Instagram access...');

            await page.goto('https://www.instagram.com', {
                waitUntil: 'domcontentloaded',
                timeout: 20000
            });

            await page.waitForTimeout(3000);

            const title = await page.title();
            console.log(`📱 Instagram title: ${title}`);

            if (title.includes('Instagram')) {
                console.log('✅ Instagram access successful');
                return true;
            } else {
                console.log('⚠️ Instagram access uncertain');
                return false;
            }

        } catch (error) {
            console.error('❌ Instagram access failed:', error.message);
            return false;
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            console.log('🧹 Cleaning up resources...');

            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }

            if (this.proxyUrl) {
                await ProxyChain.closeAnonymizedProxy(this.proxyUrl, true);
                this.proxyUrl = null;
            }

            console.log('✅ Cleanup complete');

        } catch (error) {
            console.error('❌ Cleanup error:', error.message);
        }
    }
}

module.exports = SimplifiedStreamingManager;
