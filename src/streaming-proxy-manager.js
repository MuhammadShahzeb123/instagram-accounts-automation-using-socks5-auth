const { chromium } = require('playwright');
const ProxyChain = require('proxy-chain');

class StreamingProxyManager {
    constructor() {
        this.proxyServers = new Map();
        this.browsers = new Map();
        this.streamingOptimized = true;
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
     * Create streaming-optimized proxy server
     */
    async createStreamingProxyServer(proxyString, proxyId = 'default') {
        try {
            const proxyConfig = this.parseProxyString(proxyString);

            // Create the SOCKS5 URL with authentication
            const socksUrl = `socks5://${proxyConfig.username}:${proxyConfig.password}@${proxyConfig.hostname}:${proxyConfig.port}`;

            console.log(`🎥 Creating streaming-optimized proxy server for: ${proxyConfig.hostname}:${proxyConfig.port}`);

            // Enhanced proxy options for streaming
            const proxyUrl = await ProxyChain.anonymizeProxy(socksUrl, {
                // Optimize for streaming
                timeout: 60000, // 60 seconds timeout for streams
                keepAlive: true,
                verboseLog: false,
                // Enhanced buffer settings for video streaming
                prepareRequestFunction: ({ request, username, password, hostname, port, isHtml }) => {
                    // Add streaming headers
                    request.headers['Connection'] = 'keep-alive';
                    request.headers['Keep-Alive'] = 'timeout=60, max=1000';

                    // Support for video streaming
                    if (request.headers['accept']) {
                        if (request.headers['accept'].includes('video') ||
                            request.headers['accept'].includes('application/octet-stream')) {
                            request.headers['Cache-Control'] = 'no-cache';
                            request.headers['Accept-Ranges'] = 'bytes';
                        }
                    }

                    return {
                        requestAuthentication: false,
                        upstreamProxyUrl: socksUrl,
                    };
                }
            });

            this.proxyServers.set(proxyId, {
                url: proxyUrl,
                originalProxy: proxyString,
                optimizedForStreaming: true
            });

            console.log(`✅ Streaming proxy server created: ${proxyUrl} -> ${proxyConfig.hostname}:${proxyConfig.port}`);
            return proxyUrl;
        } catch (error) {
            console.error(`❌ Failed to create streaming proxy server:`, error.message);
            throw error;
        }
    }

    /**
     * Launch browser optimized for video streaming
     */
    async launchStreamingBrowser(proxyString, browserId = null, options = {}) {
        try {
            const id = browserId || `streaming_browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create streaming-optimized proxy server
            const localProxyUrl = await this.createStreamingProxyServer(proxyString, id);

            // Enhanced browser args for video streaming
            const streamingArgs = [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',

                // Video streaming optimization
                '--enable-features=VaapiVideoDecoder',
                '--use-gl=egl',
                '--enable-gpu-rasterization',
                '--enable-zero-copy',
                '--enable-features=VaapiVideoEncoder',
                '--disable-features=UseChromeOSDirectVideoDecoder',

                // Network optimization for streaming
                '--aggressive-cache-discard',
                '--enable-tcp-fast-open',
                '--enable-experimental-web-platform-features',
                '--enable-features=NetworkService,NetworkServiceLogging',

                // Media optimization
                '--autoplay-policy=no-user-gesture-required',
                '--disable-background-media-suspend',
                '--disable-renderer-backgrounding',
                '--disable-backgrounding-occluded-windows',

                // Memory optimization for video
                '--max-old-space-size=4096',
                '--memory-pressure-off',

                // Proxy optimization
                '--proxy-bypass-list=<-loopback>',
                '--disable-proxy-certificate-handler',

                // Additional streaming flags
                '--enable-features=MediaFoundationH264Encoding',
                '--enable-features=PlatformHEVCDecoderSupport',
                '--force-video-overlays',
            ];

            // Launch browser with streaming optimizations
            const browser = await chromium.launch({
                headless: options.headless || false,
                proxy: {
                    server: localProxyUrl,
                    // Additional proxy settings for streaming
                    bypass: '<-loopback>'
                },
                args: streamingArgs,
                // Enhanced timeout for video loading
                timeout: 60000,
            });

            this.browsers.set(id, browser);

            console.log(`🎥 Streaming browser launched with ID: ${id}`);
            return { browser, browserId: id };
        } catch (error) {
            console.error(`❌ Failed to launch streaming browser:`, error.message);
            throw error;
        }
    }    /**
     * Create streaming-optimized browser context
     */
    async createStreamingContext(browser, options = {}) {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 },

            // Media permissions for streaming (fixed permissions list)
            permissions: ['camera', 'microphone'],

            // Enhanced settings for video streaming
            bypassCSP: true,
            ignoreHTTPSErrors: true,

            // Video codec support
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
                'Upgrade-Insecure-Requests': '1',
            },

            ...options
        });

        // Enable media autoplay and streaming features
        await context.addInitScript(() => {
            // Override media policies for better streaming
            Object.defineProperty(navigator, 'mediaDevices', {
                writable: true,
                value: {
                    getUserMedia: () => Promise.resolve({}),
                    enumerateDevices: () => Promise.resolve([]),
                }
            });

            // Enable autoplay for all media
            Object.defineProperty(HTMLMediaElement.prototype, 'play', {
                writable: true,
                value: function() {
                    this.autoplay = true;
                    this.muted = false;
                    return Promise.resolve();
                }
            });

            // Optimize video loading
            document.addEventListener('DOMContentLoaded', () => {
                const videos = document.querySelectorAll('video');
                videos.forEach(video => {
                    video.preload = 'auto';
                    video.autoplay = true;
                    video.controls = true;
                });
            });

            // Override autoplay policy
            if (navigator.mediaSession) {
                navigator.mediaSession.setActionHandler('play', () => {
                    console.log('Media session play action');
                });
            }
        });

        return context;
    }

    /**
     * Test streaming capability
     */
    async testStreamingCapability(browser, browserId) {
        try {
            console.log(`🎥 Testing streaming capability for browser ${browserId}...`);

            const context = await this.createStreamingContext(browser);
            const page = await context.newPage();

            // Test basic streaming capability
            const testResults = {
                ip: null,
                videoCodecs: null,
                streamingSupport: false,
                errors: []
            };

            try {
                // Test IP
                await page.goto('https://httpbin.org/ip', { waitUntil: 'networkidle', timeout: 30000 });
                const ipContent = await page.textContent('body');
                const ipData = JSON.parse(ipContent);
                testResults.ip = ipData.origin;
                console.log(`📍 Streaming browser ${browserId} IP: ${ipData.origin}`);
            } catch (error) {
                testResults.errors.push(`IP test failed: ${error.message}`);
            }

            try {
                // Test video codec support
                await page.goto('data:text/html,<html><body><video id="test" style="width:100px;height:100px"></video><script>const v=document.getElementById("test");const codecs={h264:v.canPlayType("video/mp4; codecs=avc1.42E01E"),webm:v.canPlayType("video/webm; codecs=vp8"),mp4:v.canPlayType("video/mp4")};document.body.innerHTML="<pre>"+JSON.stringify(codecs,null,2)+"</pre>";</script></body></html>');
                await page.waitForTimeout(2000);
                const codecContent = await page.textContent('pre');
                testResults.videoCodecs = JSON.parse(codecContent);
                console.log(`🎬 Video codec support:`, testResults.videoCodecs);
            } catch (error) {
                testResults.errors.push(`Codec test failed: ${error.message}`);
            }

            try {
                // Test actual streaming with a simple video
                await page.goto('https://www.w3schools.com/html/mov_bbb.mp4', { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForTimeout(5000);
                testResults.streamingSupport = true;
                console.log(`✅ Basic streaming test passed for browser ${browserId}`);
            } catch (error) {
                testResults.errors.push(`Streaming test failed: ${error.message}`);
            }

            await context.close();
            return testResults;
        } catch (error) {
            console.error(`❌ Streaming capability test failed for browser ${browserId}:`, error.message);
            return { streamingSupport: false, errors: [error.message] };
        }
    }

    /**
     * Run streaming-optimized automation task
     */
    async runStreamingTask(browser, browserId, task, options = {}) {
        try {
            console.log(`🎥 Running streaming task for browser ${browserId}...`);

            const context = await this.createStreamingContext(browser, options);
            const page = await context.newPage();

            // Set up streaming event listeners
            page.on('response', response => {
                const url = response.url();
                const contentType = response.headers()['content-type'] || '';

                if (contentType.includes('video') ||
                    url.includes('.mp4') ||
                    url.includes('.webm') ||
                    url.includes('.m3u8')) {
                    console.log(`🎬 Video stream detected: ${url.split('/').pop()} (${response.status()})`);
                }
            });

            page.on('request', request => {
                const url = request.url();
                if (url.includes('video') || url.includes('stream')) {
                    console.log(`📡 Video request: ${url.split('/').pop()}`);
                }
            });

            // Execute the custom streaming task
            if (typeof task === 'function') {
                await task(page, browserId, context);
            } else {
                console.log(`⚠️ No streaming task provided for browser ${browserId}`);
            }

            // Keep context open if specified
            if (!options.closeImmediately) {
                console.log(`🔄 Keeping streaming context open for browser ${browserId}`);
                return { page, context };
            }

            await context.close();
            return { success: true };
        } catch (error) {
            console.error(`❌ Streaming task failed for browser ${browserId}:`, error.message);
            throw error;
        }
    }

    /**
     * Run multiple streaming browsers
     */
    async runMultipleStreamingBrowsers(proxies, task, options = {}) {
        const results = [];

        for (let i = 0; i < proxies.length; i++) {
            const proxy = proxies[i];
            const browserId = `streaming_${i + 1}`;

            try {
                console.log(`🎥 Starting streaming browser ${i + 1}/${proxies.length}`);

                const { browser } = await this.launchStreamingBrowser(proxy, browserId, options);

                // Test streaming capability first
                const streamingTest = await this.testStreamingCapability(browser, browserId);

                if (!streamingTest.streamingSupport && streamingTest.errors.length > 0) {
                    console.warn(`⚠️ Streaming issues detected for browser ${browserId}:`, streamingTest.errors);
                }

                // Run the actual streaming task
                const taskResult = await this.runStreamingTask(browser, browserId, task, options);

                results.push({
                    browserId,
                    proxy,
                    streamingTest,
                    taskResult,
                    success: true
                });

                if (options.closeImmediately !== false) {
                    await this.closeBrowser(browserId);
                }

            } catch (error) {
                console.error(`❌ Failed to run streaming browser ${browserId}:`, error.message);
                results.push({
                    browserId,
                    proxy,
                    error: error.message,
                    success: false
                });
            }
        }

        return results;
    }

    /**
     * Close browser and proxy server
     */
    async closeBrowser(browserId) {
        try {
            if (this.browsers.has(browserId)) {
                await this.browsers.get(browserId).close();
                this.browsers.delete(browserId);
                console.log(`🔒 Streaming browser ${browserId} closed`);
            }

            if (this.proxyServers.has(browserId)) {
                const proxyInfo = this.proxyServers.get(browserId);
                try {
                    await ProxyChain.closeAnonymizedProxy(proxyInfo.url, true);
                } catch (closeError) {
                    console.warn(`⚠️ Error closing proxy for ${browserId}:`, closeError.message);
                }
                this.proxyServers.delete(browserId);
                console.log(`🔒 Streaming proxy server ${browserId} closed`);
            }
        } catch (error) {
            console.error(`❌ Error closing streaming browser ${browserId}:`, error.message);
        }
    }

    /**
     * Close all browsers and proxy servers
     */
    async closeAll() {
        console.log('🔒 Closing all streaming browsers and proxy servers...');

        const closingPromises = [];

        for (const browserId of this.browsers.keys()) {
            closingPromises.push(this.closeBrowser(browserId));
        }

        await Promise.allSettled(closingPromises);
        console.log('✅ All streaming browsers and proxy servers closed');
    }
}

module.exports = StreamingProxyManager;
