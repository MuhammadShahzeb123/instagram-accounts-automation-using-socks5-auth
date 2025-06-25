const StreamingProxyManager = require('./streaming-proxy-manager');

class StreamingDiagnostics {
    constructor() {
        this.streamingManager = new StreamingProxyManager();
    }

    /**
     * Test all streaming capabilities for a proxy
     */
    async runFullStreamingDiagnostics(proxyString, accountInfo = null) {
        console.log('🔍 Running comprehensive streaming diagnostics...\n');

        const diagnostics = {
            proxy: proxyString,
            account: accountInfo?.username || 'N/A',
            timestamp: new Date().toISOString(),
            tests: {
                basicConnection: { status: 'pending', details: null },
                videoCodecs: { status: 'pending', details: null },
                streamingPlatforms: { status: 'pending', details: null },
                mediaPlayback: { status: 'pending', details: null }
            },
            recommendations: []
        };

        try {
            // Test 1: Basic connection and IP verification
            console.log('🌐 Testing basic connection...');
            const { browser, browserId } = await this.streamingManager.launchStreamingBrowser(proxyString);

            const basicTest = await this.streamingManager.testStreamingCapability(browser, browserId);
            diagnostics.tests.basicConnection = {
                status: basicTest.ip ? 'passed' : 'failed',
                details: {
                    ip: basicTest.ip,
                    errors: basicTest.errors
                }
            };

            // Test 2: Video codec support
            console.log('🎬 Testing video codec support...');
            diagnostics.tests.videoCodecs = {
                status: basicTest.videoCodecs ? 'passed' : 'failed',
                details: basicTest.videoCodecs
            };

            // Test 3: Streaming platforms accessibility
            console.log('📱 Testing streaming platforms...');
            const platformTest = await this.testStreamingPlatforms(browser, browserId);
            diagnostics.tests.streamingPlatforms = {
                status: platformTest.overallStatus,
                details: platformTest.platforms
            };

            // Test 4: Media playback test
            console.log('▶️ Testing media playback...');
            const mediaTest = await this.testMediaPlayback(browser, browserId);
            diagnostics.tests.mediaPlayback = {
                status: mediaTest.canPlay ? 'passed' : 'failed',
                details: mediaTest
            };

            await this.streamingManager.closeBrowser(browserId);

            // Generate recommendations
            diagnostics.recommendations = this.generateRecommendations(diagnostics.tests);

            this.printDiagnosticsReport(diagnostics);
            return diagnostics;

        } catch (error) {
            console.error('❌ Diagnostics failed:', error.message);
            diagnostics.error = error.message;
            return diagnostics;
        }
    }

    /**
     * Test streaming platforms accessibility
     */
    async testStreamingPlatforms(browser, browserId) {
        const platforms = {
            youtube: { accessible: false, loadTime: 0, errors: [] },
            instagram: { accessible: false, loadTime: 0, errors: [] },
            tiktok: { accessible: false, loadTime: 0, errors: [] }
        };

        const context = await this.streamingManager.createStreamingContext(browser);
        const page = await context.newPage();

        // Test YouTube
        try {
            console.log('  🔴 Testing YouTube...');
            const startTime = Date.now();
            await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForSelector('video, [data-testid="video-player"]', { timeout: 10000 });
            platforms.youtube.accessible = true;
            platforms.youtube.loadTime = Date.now() - startTime;
            console.log('    ✅ YouTube accessible');
        } catch (error) {
            platforms.youtube.errors.push(error.message);
            console.log('    ❌ YouTube failed:', error.message);
        }

        // Test Instagram
        try {
            console.log('  📷 Testing Instagram...');
            const startTime = Date.now();
            await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForSelector('video, [role="img"]', { timeout: 10000 });
            platforms.instagram.accessible = true;
            platforms.instagram.loadTime = Date.now() - startTime;
            console.log('    ✅ Instagram accessible');
        } catch (error) {
            platforms.instagram.errors.push(error.message);
            console.log('    ❌ Instagram failed:', error.message);
        }

        // Test TikTok
        try {
            console.log('  🎵 Testing TikTok...');
            const startTime = Date.now();
            await page.goto('https://www.tiktok.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForSelector('video, [data-e2e="video-player"]', { timeout: 10000 });
            platforms.tiktok.accessible = true;
            platforms.tiktok.loadTime = Date.now() - startTime;
            console.log('    ✅ TikTok accessible');
        } catch (error) {
            platforms.tiktok.errors.push(error.message);
            console.log('    ❌ TikTok failed:', error.message);
        }

        await context.close();

        const accessibleCount = Object.values(platforms).filter(p => p.accessible).length;
        const overallStatus = accessibleCount === 3 ? 'passed' : accessibleCount > 0 ? 'partial' : 'failed';

        return { platforms, overallStatus };
    }

    /**
     * Test media playback capabilities
     */
    async testMediaPlayback(browser, browserId) {
        const context = await this.streamingManager.createStreamingContext(browser);
        const page = await context.newPage();

        const testR = {
            canPlay: false,
            formats: {},
            errors: []
        };

        try {
            // Create test page with video elements
            await page.setContent(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Media Playback Test</title>
                </head>
                <body>
                    <video id="mp4-test" controls style="width: 300px; height: 200px;">
                        <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
                    </video>
                    <video id="webm-test" controls style="width: 300px; height: 200px;">
                        <source src="https://www.w3schools.com/html/mov_bbb.webm" type="video/webm">
                    </video>
                    <div id="results"></div>
                    <script>
                        const results = { mp4: false, webm: false };

                        // Test MP4
                        const mp4Video = document.getElementById('mp4-test');
                        mp4Video.addEventListener('loadedmetadata', () => {
                            results.mp4 = true;
                            document.getElementById('results').innerHTML = JSON.stringify(results);
                        });

                        // Test WebM
                        const webmVideo = document.getElementById('webm-test');
                        webmVideo.addEventListener('loadedmetadata', () => {
                            results.webm = true;
                            document.getElementById('results').innerHTML = JSON.stringify(results);
                        });

                        // Force load
                        mp4Video.load();
                        webmVideo.load();

                        // Update results after timeout
                        setTimeout(() => {
                            document.getElementById('results').innerHTML = JSON.stringify(results);
                        }, 10000);
                    </script>
                </body>
                </html>
            `);

            // Wait for video loading tests
            await page.waitForTimeout(15000);

            // Get test results
            const results = await page.evaluate(() => {
                const resultsDiv = document.getElementById('results');
                try {
                    return JSON.parse(resultsDiv.innerHTML || '{}');
                } catch {
                    return {};
                }
            });

            testR.formats = results;
            testR.canPlay = Object.values(results).some(canPlay => canPlay);

            console.log('    📊 Media playback results:', results);

        } catch (error) {
            testR.errors.push(error.message);
            console.log('    ❌ Media playback test failed:', error.message);
        }

        await context.close();
        return testR;
    }

    /**
     * Generate recommendations based on test results
     */
    generateRecommendations(tests) {
        const recommendations = [];

        if (tests.basicConnection.status === 'failed') {
            recommendations.push({
                type: 'critical',
                message: 'Basic connection failed. Check proxy configuration and credentials.',
                action: 'Verify proxy settings and network connectivity'
            });
        }

        if (tests.videoCodecs.status === 'failed') {
            recommendations.push({
                type: 'warning',
                message: 'Video codec support is limited. Some media may not play properly.',
                action: 'Consider using different browser configuration or proxy server'
            });
        }

        if (tests.streamingPlatforms.status === 'failed') {
            recommendations.push({
                type: 'critical',
                message: 'Cannot access streaming platforms through this proxy.',
                action: 'Try different proxy server or check platform blocking'
            });
        } else if (tests.streamingPlatforms.status === 'partial') {
            recommendations.push({
                type: 'warning',
                message: 'Some streaming platforms are not accessible.',
                action: 'Check specific platform requirements and proxy compatibility'
            });
        }

        if (tests.mediaPlayback.status === 'failed') {
            recommendations.push({
                type: 'critical',
                message: 'Media playback is not working. Videos will not stream properly.',
                action: 'Check browser media policies and proxy configuration'
            });
        }

        if (recommendations.length === 0) {
            recommendations.push({
                type: 'success',
                message: 'All streaming tests passed! This proxy is suitable for video streaming.',
                action: 'You can proceed with video streaming operations'
            });
        }

        return recommendations;
    }

    /**
     * Print formatted diagnostics report
     */
    printDiagnosticsReport(diagnostics) {
        console.log('\n' + '='.repeat(60));
        console.log('🎥 STREAMING DIAGNOSTICS REPORT');
        console.log('='.repeat(60));
        console.log(`📅 Timestamp: ${diagnostics.timestamp}`);
        console.log(`🌐 Proxy: ${diagnostics.proxy.split(':')[1]}:${diagnostics.proxy.split(':')[2]}`);
        console.log(`👤 Account: ${diagnostics.account}`);
        console.log('');

        // Test results
        console.log('📊 TEST RESULTS:');
        console.log('-'.repeat(40));

        Object.entries(diagnostics.tests).forEach(([testName, result]) => {
            const statusIcon = result.status === 'passed' ? '✅' :
                              result.status === 'partial' ? '⚠️' : '❌';
            console.log(`${statusIcon} ${testName.toUpperCase()}: ${result.status.toUpperCase()}`);
        });

        console.log('');

        // Recommendations
        console.log('💡 RECOMMENDATIONS:');
        console.log('-'.repeat(40));
        diagnostics.recommendations.forEach((rec, index) => {
            const icon = rec.type === 'success' ? '✅' :
                        rec.type === 'warning' ? '⚠️' : '❌';
            console.log(`${icon} ${rec.message}`);
            console.log(`   Action: ${rec.action}`);
            if (index < diagnostics.recommendations.length - 1) console.log('');
        });

        console.log('\n' + '='.repeat(60));
    }

    /**
     * Quick streaming test for a specific account
     */
    async quickStreamingTest(accountIndex, proxyAccountPairs) {
        if (accountIndex < 1 || accountIndex > proxyAccountPairs.length) {
            console.error(`❌ Invalid account index: ${accountIndex}`);
            return;
        }

        const selectedPair = proxyAccountPairs[accountIndex - 1];
        const { proxy, account } = selectedPair;

        console.log(`🎥 Quick streaming test for account #${accountIndex}: ${account.username}`);
        console.log(`🌐 Proxy: ${proxy.split(':')[1]}:${proxy.split(':')[2]}\n`);

        return await this.runFullStreamingDiagnostics(proxy, account);
    }
}

module.exports = StreamingDiagnostics;
