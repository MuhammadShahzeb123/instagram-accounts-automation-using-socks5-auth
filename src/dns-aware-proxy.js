const http = require('http');
const https = require('https');
const net = require('net');
const url = require('url');
const { SocksClient } = require('socks');
const dns = require('dns');

/**
 * DNS-Aware SOCKS5 to HTTP Proxy Converter
 * Handles DNS resolution through the SOCKS5 proxy for streaming media compatibility
 */
class DNSAwareProxy {
    constructor(socksConfig) {
        this.socksConfig = socksConfig;
        this.server = null;
        this.connections = new Set();
        this.stats = {
            requests: 0,
            errors: 0,
            activeConnections: 0
        };
    }

    /**
     * Start the local HTTP proxy server
     */
    async start(port = 0) {
        return new Promise((resolve, reject) => {
            this.server = http.createServer();

            // Handle HTTP CONNECT method (for HTTPS)
            this.server.on('connect', (req, clientSocket, head) => {
                this.handleConnect(req, clientSocket, head);
            });

            // Handle regular HTTP requests
            this.server.on('request', (req, res) => {
                this.handleRequest(req, res);
            });

            this.server.on('error', (error) => {
                console.error('❌ Proxy server error:', error);
                reject(error);
            });

            this.server.listen(port, '127.0.0.1', () => {
                const actualPort = this.server.address().port;
                console.log(`✅ DNS-Aware Proxy started on http://127.0.0.1:${actualPort}`);
                resolve({
                    port: actualPort,
                    url: `http://127.0.0.1:${actualPort}`
                });
            });
        });
    }

    /**
     * Handle HTTPS CONNECT requests
     */
    async handleConnect(req, clientSocket, head) {
        this.stats.requests++;
        this.stats.activeConnections++;

        const { hostname, port } = this.parseHostPort(req.url);

        try {
            console.log(`🔗 CONNECT ${hostname}:${port}`);

            // Create SOCKS connection with DNS resolution through proxy
            const socksConnection = await SocksClient.createConnection({
                proxy: {
                    host: this.socksConfig.host,
                    port: this.socksConfig.port,
                    type: 5,
                    userId: this.socksConfig.auth?.username,
                    password: this.socksConfig.auth?.password
                },
                command: 'connect',
                destination: {
                    host: hostname, // Let SOCKS proxy resolve DNS
                    port: parseInt(port)
                }
            });

            // Send success response to client
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

            // Pipe data between client and SOCKS connection
            const cleanup = () => {
                this.stats.activeConnections--;
                socksConnection.socket.destroy();
                clientSocket.destroy();
            };

            clientSocket.on('error', cleanup);
            socksConnection.socket.on('error', cleanup);
            clientSocket.on('close', cleanup);
            socksConnection.socket.on('close', cleanup);

            // Start tunneling
            clientSocket.pipe(socksConnection.socket);
            socksConnection.socket.pipe(clientSocket);

        } catch (error) {
            console.error(`❌ CONNECT failed for ${hostname}:${port}:`, error.message);
            this.stats.errors++;
            this.stats.activeConnections--;

            clientSocket.write('HTTP/1.1 500 Connection Failed\r\n\r\n');
            clientSocket.end();
        }
    }

    /**
     * Handle regular HTTP requests
     */
    async handleRequest(req, res) {
        this.stats.requests++;

        try {
            const targetUrl = req.url.startsWith('http') ? req.url : `http://${req.headers.host}${req.url}`;
            const parsedUrl = new URL(targetUrl);

            console.log(`📡 ${req.method} ${parsedUrl.hostname}${parsedUrl.pathname}`);

            // Create SOCKS connection for HTTP request
            const socksConnection = await SocksClient.createConnection({
                proxy: {
                    host: this.socksConfig.host,
                    port: this.socksConfig.port,
                    type: 5,
                    userId: this.socksConfig.auth?.username,
                    password: this.socksConfig.auth?.password
                },
                command: 'connect',
                destination: {
                    host: parsedUrl.hostname, // DNS resolved by SOCKS proxy
                    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80)
                }
            });

            // Forward the HTTP request
            const requestOptions = {
                method: req.method,
                path: parsedUrl.pathname + parsedUrl.search,
                headers: this.cleanHeaders(req.headers),
                createConnection: () => socksConnection.socket
            };

            const protocol = parsedUrl.protocol === 'https:' ? https : http;
            const proxyReq = protocol.request(requestOptions, (proxyRes) => {
                // Forward response headers
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res);
            });

            proxyReq.on('error', (error) => {
                console.error('❌ Request error:', error.message);
                this.stats.errors++;
                if (!res.headersSent) {
                    res.writeHead(500);
                    res.end('Proxy Error');
                }
            });

            // Forward request body
            req.pipe(proxyReq);

        } catch (error) {
            console.error('❌ HTTP request failed:', error.message);
            this.stats.errors++;

            if (!res.headersSent) {
                res.writeHead(500);
                res.end('Proxy Error');
            }
        }
    }

    /**
     * Parse hostname and port from request URL
     */
    parseHostPort(hostPort) {
        const [hostname, port] = hostPort.split(':');
        return {
            hostname,
            port: port || '443'
        };
    }

    /**
     * Clean headers for forwarding
     */
    cleanHeaders(headers) {
        const cleaned = { ...headers };

        // Remove hop-by-hop headers
        delete cleaned['connection'];
        delete cleaned['proxy-connection'];
        delete cleaned['proxy-authorization'];
        delete cleaned['proxy-authenticate'];
        delete cleaned['upgrade'];
        delete cleaned['te'];
        delete cleaned['trailer'];
        delete cleaned['transfer-encoding'];

        return cleaned;
    }

    /**
     * Get proxy statistics
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Stop the proxy server
     */
    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('🛑 DNS-Aware Proxy stopped');
                    resolve();
                });

                // Close all active connections
                this.connections.forEach(conn => conn.destroy());
                this.connections.clear();
            } else {
                resolve();
            }
        });
    }
}

module.exports = DNSAwareProxy;
