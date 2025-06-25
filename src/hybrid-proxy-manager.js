const ProxyChain = require('proxy-chain');
const http = require('http');
const url = require('url');
const net = require('net');

/**
 * Hybrid Proxy Manager for Video Streaming
 *
 * This manager creates a hybrid proxy solution:
 * - Regular traffic goes through SOCKS5 proxy
 * - Media/video traffic goes through HTTP proxy for better streaming support
 * - Uses request interception to route traffic appropriately
 */
class HybridProxyManagerImproved {
    constructor() {
        this.socksProxyUrl = null;
        this.httpProxyUrl = null;
        this.localHttpProxyServer = null;
        this.localProxyPort = null;

        // Media file extensions and MIME types that should use HTTP proxy
        this.mediaExtensions = [
            '.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv',
            '.m4v', '.3gp', '.ts', '.m3u8', '.mpd', '.m4a', '.mp3', '.wav',
            '.aac', '.flac', '.opus'
        ];

        this.mediaMimeTypes = [
            'video/', 'audio/', 'application/vnd.apple.mpegurl',
            'application/dash+xml', 'application/x-mpegURL'
        ];

        this.mediaHosts = [
            'instagram.com', 'cdninstagram.com', 'fbcdn.net',
            'tiktok.com', 'tiktokcdn.com', 'musical.ly',
            'youtube.com', 'googlevideo.com', 'ytimg.com',
            'twitter.com', 'twimg.com', 'video.twimg.com'
        ];
    }

    /**
     * Initialize the hybrid proxy system
     */
    async initialize(proxyConfig) {
        try {
            console.log('🔧 Initializing Hybrid Proxy Manager...');

            // Setup SOCKS5 proxy URL
            const { host, port, auth } = proxyConfig;
            const authString = auth ? `${auth.username}:${auth.password}@` : '';
            this.socksProxyUrl = `socks5://${authString}${host}:${port}`;

            // Create HTTP proxy chain for media content
            this.httpProxyUrl = await ProxyChain.anonymizeProxy(this.socksProxyUrl);
            console.log('✅ HTTP proxy chain created:', this.httpProxyUrl);

            // Create local HTTP proxy server for selective routing
            await this.createLocalProxyServer();

            console.log('🎯 Hybrid proxy system initialized successfully');
            console.log(`   - SOCKS5 Proxy: ${this.socksProxyUrl}`);
            console.log(`   - HTTP Proxy: ${this.httpProxyUrl}`);
            console.log(`   - Local Proxy: http://127.0.0.1:${this.localProxyPort}`);

            return {
                success: true,
                localProxyUrl: `http://127.0.0.1:${this.localProxyPort}`,
                socksProxyUrl: this.socksProxyUrl,
                httpProxyUrl: this.httpProxyUrl
            };

        } catch (error) {
            console.error('❌ Failed to initialize hybrid proxy:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a local HTTP proxy server that routes requests selectively
     */
    async createLocalProxyServer() {
        return new Promise((resolve, reject) => {
            this.localHttpProxyServer = http.createServer();

            // Handle HTTP requests
            this.localHttpProxyServer.on('request', (req, res) => {
                this.handleHttpRequest(req, res);
            });

            // Handle HTTPS CONNECT requests
            this.localHttpProxyServer.on('connect', (req, clientSocket, head) => {
                this.handleHttpsConnect(req, clientSocket, head);
            });

            // Start server on random available port
            this.localHttpProxyServer.listen(0, '127.0.0.1', () => {
                this.localProxyPort = this.localHttpProxyServer.address().port;
                console.log(`🌐 Local HTTP proxy server started on port ${this.localProxyPort}`);
                resolve();
            });

            this.localHttpProxyServer.on('error', (error) => {
                console.error('❌ Local proxy server error:', error.message);
                reject(error);
            });
        });
    }

    /**
     * Handle HTTP requests through the local proxy
     */
    async handleHttpRequest(req, res) {
        try {
            const isMediaRequest = this.isMediaRequest(req);
            const targetProxyUrl = isMediaRequest ? this.httpProxyUrl : this.socksProxyUrl;

            console.log(`🔄 Routing ${isMediaRequest ? 'MEDIA' : 'REGULAR'} request: ${req.url}`);

            // Parse target proxy
            const proxyParsed = new URL(targetProxyUrl);

            // Create request options
            const options = {
                hostname: proxyParsed.hostname,
                port: proxyParsed.port,
                method: req.method,
                path: req.url,
                headers: { ...req.headers }
            };

            // Add proxy authorization if needed
            if (proxyParsed.username && proxyParsed.password) {
                const auth = Buffer.from(`${proxyParsed.username}:${proxyParsed.password}`).toString('base64');
                options.headers['Proxy-Authorization'] = `Basic ${auth}`;
            }

            // Make request through proxy
            const proxyReq = http.request(options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
            });

            proxyReq.on('error', (error) => {
                console.error('❌ Proxy request error:', error.message);
                res.writeHead(500);
                res.end('Proxy Error');
            });

            req.pipe(proxyReq);

        } catch (error) {
            console.error('❌ HTTP request handling error:', error.message);
            res.writeHead(500);
            res.end('Internal Server Error');
        }
    }

    /**
     * Handle HTTPS CONNECT requests
     */
    async handleHttpsConnect(req, clientSocket, head) {
        try {
            const { hostname, port } = url.parse(`http://${req.url}`);
            const isMediaRequest = this.isMediaHost(hostname);
            const targetProxyUrl = isMediaRequest ? this.httpProxyUrl : this.socksProxyUrl;

            console.log(`🔒 HTTPS CONNECT ${isMediaRequest ? 'MEDIA' : 'REGULAR'}: ${hostname}:${port}`);

            // Parse target proxy
            const proxyParsed = new URL(targetProxyUrl);

            // Connect to proxy
            const proxySocket = net.connect(proxyParsed.port, proxyParsed.hostname, () => {
                // Send CONNECT request to proxy
                let connectRequest = `CONNECT ${hostname}:${port} HTTP/1.1\r\n`;
                connectRequest += `Host: ${hostname}:${port}\r\n`;

                if (proxyParsed.username && proxyParsed.password) {
                    const auth = Buffer.from(`${proxyParsed.username}:${proxyParsed.password}`).toString('base64');
                    connectRequest += `Proxy-Authorization: Basic ${auth}\r\n`;
                }

                connectRequest += '\r\n';
                proxySocket.write(connectRequest);
            });

            proxySocket.on('data', (data) => {
                if (data.toString().startsWith('HTTP/1.1 200')) {
                    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
                    proxySocket.pipe(clientSocket);
                    clientSocket.pipe(proxySocket);
                } else {
                    clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
                }
            });

            proxySocket.on('error', (error) => {
                console.error('❌ HTTPS proxy error:', error.message);
                clientSocket.end('HTTP/1.1 502 Bad Gateway\r\n\r\n');
            });

            clientSocket.on('error', (error) => {
                console.error('❌ Client socket error:', error.message);
                proxySocket.destroy();
            });

        } catch (error) {
            console.error('❌ HTTPS CONNECT handling error:', error.message);
            clientSocket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        }
    }

    /**
     * Check if request is for media content
     */
    isMediaRequest(req) {
        const requestUrl = req.url.toLowerCase();
        const userAgent = req.headers['user-agent'] || '';
        const accept = req.headers['accept'] || '';

        // Check URL path for media extensions
        const hasMediaExtension = this.mediaExtensions.some(ext =>
            requestUrl.includes(ext)
        );

        // Check Accept header for media MIME types
        const acceptsMedia = this.mediaMimeTypes.some(type =>
            accept.includes(type)
        );

        // Check for media-related keywords in URL
        const hasMediaKeywords = [
            'video', 'audio', 'stream', 'media', 'player',
            'mp4', 'webm', 'm3u8', 'manifest'
        ].some(keyword => requestUrl.includes(keyword));

        // Check if it's from a known media host
        const isFromMediaHost = this.isMediaHost(this.extractHostFromUrl(requestUrl));

        return hasMediaExtension || acceptsMedia || hasMediaKeywords || isFromMediaHost;
    }

    /**
     * Check if hostname is a known media host
     */
    isMediaHost(hostname) {
        if (!hostname) return false;
        return this.mediaHosts.some(host =>
            hostname.includes(host) || hostname.endsWith(host)
        );
    }

    /**
     * Extract hostname from URL
     */
    extractHostFromUrl(requestUrl) {
        try {
            if (requestUrl.startsWith('http')) {
                return new URL(requestUrl).hostname;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get browser launch options for hybrid proxy
     */
    getBrowserLaunchOptions() {
        if (!this.localProxyPort) {
            throw new Error('Hybrid proxy not initialized');
        }

        return {
            args: [
                // Use local proxy server
                `--proxy-server=http://127.0.0.1:${this.localProxyPort}`,

                // Enhanced media and streaming flags
                '--enable-features=VaapiVideoDecoder,VaapiVideoEncoder',
                '--use-gl=swiftshader',
                '--enable-accelerated-video-decode',
                '--enable-accelerated-video-encode',
                '--enable-gpu-rasterization',
                '--enable-zero-copy',

                // Network and proxy optimization
                '--aggressive-cache-discard',
                '--enable-tcp-fast-open',
                '--enable-async-dns',
                '--enable-simple-cache-backend',
                '--enable-features=NetworkService',

                // Disable problematic features for proxy
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-background-networking',

                // Media streaming optimization
                '--autoplay-policy=no-user-gesture-required',
                '--disable-features=MediaRouter',
                '--enable-features=VaapiVideoDecoder',
                '--ignore-certificate-errors-spki-list',
                '--ignore-ssl-errors-on-localhost',

                // Security and privacy (maintain proxy anonymity)
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--disable-ipc-flooding-protection',

                // Additional stability flags
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu-sandbox',
                '--disable-software-rasterizer',

                // Logging for debugging
                '--enable-logging',
                '--log-level=1'
            ]
        };
    }

    /**
     * Setup request interception for better media handling
     */
    async setupRequestInterception(page) {
        try {
            console.log('🎯 Setting up request interception for hybrid proxy...');

            await page.setRequestInterception(true);

            page.on('request', async (request) => {
                try {
                    const url = request.url();
                    const resourceType = request.resourceType();
                    const isMedia = resourceType === 'media' ||
                                   resourceType === 'xhr' ||
                                   this.isMediaRequest({ url, headers: request.headers() });

                    if (isMedia) {
                        console.log(`🎬 Media request intercepted: ${url}`);

                        // Add headers to improve media streaming
                        const headers = {
                            ...request.headers(),
                            'Cache-Control': 'no-cache',
                            'Pragma': 'no-cache',
                            'Range': request.headers()['range'] || 'bytes=0-'
                        };

                        await request.continue({ headers });
                    } else {
                        await request.continue();
                    }
                } catch (error) {
                    console.error('❌ Request interception error:', error.message);
                    try {
                        await request.continue();
                    } catch (continueError) {
                        console.error('❌ Failed to continue request:', continueError.message);
                    }
                }
            });

            console.log('✅ Request interception setup complete');

        } catch (error) {
            console.error('❌ Failed to setup request interception:', error.message);
            throw error;
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            console.log('🧹 Cleaning up hybrid proxy resources...');

            if (this.localHttpProxyServer) {
                this.localHttpProxyServer.close();
                this.localHttpProxyServer = null;
            }

            if (this.httpProxyUrl) {
                await ProxyChain.closeAnonymizedProxy(this.httpProxyUrl, true);
                this.httpProxyUrl = null;
            }

            console.log('✅ Hybrid proxy cleanup complete');

        } catch (error) {
            console.error('❌ Cleanup error:', error.message);
        }
    }

    /**
     * Get status information
     */
    getStatus() {
        return {
            initialized: !!this.localProxyPort,
            localProxyPort: this.localProxyPort,
            socksProxyUrl: this.socksProxyUrl ? '[CONFIGURED]' : null,
            httpProxyUrl: this.httpProxyUrl ? '[CONFIGURED]' : null,
            serverRunning: !!this.localHttpProxyServer
        };
    }
}

module.exports = HybridProxyManagerImproved;
