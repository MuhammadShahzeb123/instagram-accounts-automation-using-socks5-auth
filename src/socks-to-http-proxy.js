const http = require('http');
const net = require('net');
const url = require('url');
const dns = require('dns').promises;

/**
 * SOCKS5 to HTTP Proxy Converter
 *
 * This creates a local HTTP proxy server that forwards all traffic
 * through a SOCKS5 proxy with proper DNS resolution.
 */
class SocksToHttpProxy {
    constructor() {
        this.server = null;
        this.port = null;
        this.socksConfig = null;
        this.isRunning = false;
    }

    /**
     * Start the HTTP proxy server
     * @param {Object} socksConfig - SOCKS5 proxy configuration
     * @param {number} localPort - Local port for HTTP proxy (0 for random)
     */
    async start(socksConfig, localPort = 0) {
        this.socksConfig = socksConfig;

        return new Promise((resolve, reject) => {
            this.server = http.createServer();

            // Handle HTTP requests
            this.server.on('request', (req, res) => {
                this.handleHttpRequest(req, res);
            });

            // Handle HTTPS CONNECT requests
            this.server.on('connect', (req, clientSocket, head) => {
                this.handleHttpsConnect(req, clientSocket, head);
            });

            this.server.on('error', (error) => {
                console.error('❌ HTTP proxy server error:', error.message);
                reject(error);
            });

            this.server.listen(localPort, '127.0.0.1', () => {
                this.port = this.server.address().port;
                this.isRunning = true;
                console.log(`🌐 HTTP proxy server started on http://127.0.0.1:${this.port}`);
                console.log(`🔗 Forwarding through SOCKS5: ${socksConfig.host}:${socksConfig.port}`);
                resolve({
                    success: true,
                    proxyUrl: `http://127.0.0.1:${this.port}`,
                    port: this.port
                });
            });
        });
    }

    /**
     * Handle HTTP requests (non-HTTPS)
     */
    async handleHttpRequest(clientReq, clientRes) {
        try {
            const targetUrl = new URL(clientReq.url);
            const hostname = targetUrl.hostname;
            const port = targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80);

            console.log(`🔄 HTTP Request: ${hostname}:${port} ${clientReq.url}`);

            // Connect through SOCKS5
            const socksSocket = await this.connectThroughSocks(hostname, port);

            // Forward the HTTP request
            const requestData = [
                `${clientReq.method} ${targetUrl.pathname}${targetUrl.search || ''} HTTP/1.1`,
                `Host: ${hostname}`,
                ...Object.entries(clientReq.headers).map(([key, value]) => `${key}: ${value}`),
                '',
                ''
            ].join('\r\n');

            socksSocket.write(requestData);

            // Forward request body if present
            clientReq.on('data', chunk => socksSocket.write(chunk));
            clientReq.on('end', () => {
                // Don't end the socket, just finish the request
            });

            // Forward response back to client
            socksSocket.on('data', data => clientRes.write(data));
            socksSocket.on('end', () => clientRes.end());
            socksSocket.on('error', error => {
                console.error('❌ SOCKS socket error:', error.message);
                clientRes.statusCode = 502;
                clientRes.end('Proxy Error');
            });

        } catch (error) {
            console.error('❌ HTTP request error:', error.message);
            clientRes.statusCode = 502;
            clientRes.end('Proxy Error');
        }
    }

    /**
     * Handle HTTPS CONNECT requests
     */
    async handleHttpsConnect(req, clientSocket, head) {
        try {
            const [hostname, port] = req.url.split(':');
            const targetPort = parseInt(port) || 443;

            console.log(`🔒 HTTPS CONNECT: ${hostname}:${targetPort}`);

            // Connect through SOCKS5
            const socksSocket = await this.connectThroughSocks(hostname, targetPort);

            // Send success response to client
            clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

            // Pipe data between client and SOCKS socket
            socksSocket.pipe(clientSocket);
            clientSocket.pipe(socksSocket);

            // Handle errors
            socksSocket.on('error', error => {
                console.error('❌ SOCKS socket error:', error.message);
                clientSocket.destroy();
            });

            clientSocket.on('error', error => {
                console.error('❌ Client socket error:', error.message);
                socksSocket.destroy();
            });

        } catch (error) {
            console.error('❌ HTTPS CONNECT error:', error.message);
            clientSocket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
            clientSocket.destroy();
        }
    }

    /**
     * Connect to target through SOCKS5 proxy with proper DNS resolution
     */
    async connectThroughSocks(hostname, port) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();

            // Connect to SOCKS5 proxy
            socket.connect(this.socksConfig.port, this.socksConfig.host, () => {
                // SOCKS5 handshake
                this.performSocksHandshake(socket, hostname, port)
                    .then(() => resolve(socket))
                    .catch(reject);
            });

            socket.on('error', error => {
                reject(new Error(`SOCKS5 connection failed: ${error.message}`));
            });

            // Set timeout
            socket.setTimeout(30000, () => {
                socket.destroy();
                reject(new Error('SOCKS5 connection timeout'));
            });
        });
    }

    /**
     * Perform SOCKS5 handshake with authentication
     */
    async performSocksHandshake(socket, hostname, port) {
        return new Promise((resolve, reject) => {
            let step = 'auth';
            let buffer = Buffer.alloc(0);

            socket.on('data', (data) => {
                buffer = Buffer.concat([buffer, data]);

                if (step === 'auth') {
                    if (buffer.length >= 2) {
                        if (buffer[0] !== 0x05) {
                            return reject(new Error('Invalid SOCKS version'));
                        }

                        if (buffer[1] === 0x02) {
                            // Username/password authentication required
                            const authBuffer = Buffer.alloc(3 + this.socksConfig.username.length + this.socksConfig.password.length);
                            let offset = 0;
                            authBuffer[offset++] = 0x01; // Auth version
                            authBuffer[offset++] = this.socksConfig.username.length;
                            authBuffer.write(this.socksConfig.username, offset);
                            offset += this.socksConfig.username.length;
                            authBuffer[offset++] = this.socksConfig.password.length;
                            authBuffer.write(this.socksConfig.password, offset);

                            socket.write(authBuffer);
                            step = 'auth_response';
                            buffer = Buffer.alloc(0);
                        } else if (buffer[1] === 0x00) {
                            // No authentication required
                            this.sendConnectRequest(socket, hostname, port);
                            step = 'connect';
                            buffer = Buffer.alloc(0);
                        } else {
                            return reject(new Error('SOCKS5 authentication method not supported'));
                        }
                    }
                } else if (step === 'auth_response') {
                    if (buffer.length >= 2) {
                        if (buffer[0] !== 0x01 || buffer[1] !== 0x00) {
                            return reject(new Error('SOCKS5 authentication failed'));
                        }
                        this.sendConnectRequest(socket, hostname, port);
                        step = 'connect';
                        buffer = Buffer.alloc(0);
                    }
                } else if (step === 'connect') {
                    if (buffer.length >= 10) {
                        if (buffer[0] !== 0x05 || buffer[1] !== 0x00) {
                            return reject(new Error(`SOCKS5 connect failed: ${buffer[1]}`));
                        }
                        resolve();
                    }
                }
            });

            // Send initial handshake
            const handshake = Buffer.from([0x05, 0x02, 0x00, 0x02]); // Version 5, 2 methods, no auth, username/password
            socket.write(handshake);
        });
    }

    /**
     * Send SOCKS5 connect request
     */
    sendConnectRequest(socket, hostname, port) {
        const hostBuffer = Buffer.from(hostname);
        const request = Buffer.alloc(7 + hostBuffer.length);
        let offset = 0;

        request[offset++] = 0x05; // SOCKS version
        request[offset++] = 0x01; // Connect command
        request[offset++] = 0x00; // Reserved
        request[offset++] = 0x03; // Domain name type
        request[offset++] = hostBuffer.length; // Domain length
        hostBuffer.copy(request, offset);
        offset += hostBuffer.length;
        request.writeUInt16BE(port, offset); // Port

        socket.write(request);
    }

    /**
     * Stop the proxy server
     */
    async stop() {
        if (this.server && this.isRunning) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    this.isRunning = false;
                    console.log('🔒 HTTP proxy server stopped');
                    resolve();
                });
            });
        }
    }

    /**
     * Get proxy status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            port: this.port,
            proxyUrl: this.isRunning ? `http://127.0.0.1:${this.port}` : null,
            socksConfig: this.socksConfig ? {
                host: this.socksConfig.host,
                port: this.socksConfig.port,
                hasAuth: !!(this.socksConfig.username && this.socksConfig.password)
            } : null
        };
    }
}

module.exports = SocksToHttpProxy;
