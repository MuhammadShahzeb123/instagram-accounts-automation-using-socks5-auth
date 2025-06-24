const CompleteStreamingManager = require('./complete-streaming-manager');

/**
 * Comprehensive test suite for the Complete Streaming Manager
 * Tests SOCKS5 to HTTP proxy conversion and streaming capabilities
 */
async function runCompleteTest() {
    console.log('🎯 Starting Complete Streaming Manager Test Suite\n');

    // SOCKS5 proxy configuration (replace with your actual proxy)
    const socksConfig = {
        host: '103.175.238.8',
        port: 40000,
        auth: {
            username: 'Flirtnetwork',
            password: 'Flirt@67890'
        }
    };

    const manager = new CompleteStreamingManager(socksConfig);
    let testResults = {
        proxyStart: false,
        browserLaunch: false,
        ipCheck: false,
        dnsResolution: false,
        instagramLoad: false,
        videoStreaming: false,
        mediaDetection: false
    };

    try {
        // Test 1: Initialize proxy
        console.log('🔧 Test 1: Initializing DNS-aware proxy...');
        const proxyInfo = await manager.initialize();
        testResults.proxyStart = true;
        console.log(`✅ Proxy started on: ${proxyInfo.url}\n`);

        // Test 2: Launch browser
        console.log('🌐 Test 2: Launching browser with streaming optimizations...');
        await manager.launchBrowser({ headless: false });
        testResults.browserLaunch = true;
        console.log('✅ Browser launched successfully\n');

        // Test 3: Run proxy functionality test
        console.log('🧪 Test 3: Running comprehensive proxy test...');
        const proxyTest = await manager.testProxy();

        if (proxyTest.success) {
            testResults.ipCheck = true;
            testResults.dnsResolution = true;
            testResults.mediaDetection = proxyTest.mediaRequests > 0;
            console.log('✅ Proxy test passed\n');
        } else {
            console.log('❌ Proxy test failed:', proxyTest.error, '\n');
        }

        // Test 4: Direct video streaming test
        console.log('🎥 Test 4: Testing direct video streaming...');
        const context = await manager.createContext();
        const page = await context.newPage();

        try {
            // Test direct MP4 link
            const videoUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
            console.log('📹 Testing direct MP4 streaming...');

            await page.goto(videoUrl, { timeout: 30000 });
            await page.waitForTimeout(5000);

            // Check if video loaded
            const videoElement = await page.$('video');
            if (videoElement) {
                testResults.videoStreaming = true;
                console.log('✅ Direct video streaming works');
            } else {
                console.log('⚠️  Video element not found, but page loaded');
            }

        } catch (error) {
            console.log('❌ Direct video test failed:', error.message);
        }

        // Test 5: Instagram streaming test
        console.log('\n📱 Test 5: Testing Instagram media loading...');
        try {
            const success = await manager.navigateWithStreaming(page, 'https://www.instagram.com/explore/');
            testResults.instagramLoad = success;

            if (success) {
                console.log('✅ Instagram loaded successfully');

                // Wait for media requests to accumulate
                await page.waitForTimeout(10000);

                const stats = manager.getStats();
                console.log(`📊 Media requests detected: ${stats.media.totalRequests}`);

                if (stats.media.totalRequests > 0) {
                    testResults.mediaDetection = true;
                    console.log('🎬 Recent media requests:');
                    stats.media.recentRequests.forEach((req, idx) => {
                        console.log(`  ${idx + 1}. ${req.type}: ${req.url.substring(0, 60)}...`);
                    });
                }
            }

        } catch (error) {
            console.log('❌ Instagram test failed:', error.message);
        }

        await context.close();

        // Test 6: YouTube streaming test (optional)
        console.log('\n🎵 Test 6: Testing YouTube compatibility...');
        const ytContext = await manager.createContext();
        const ytPage = await ytContext.newPage();

        try {
            await manager.navigateWithStreaming(ytPage, 'https://www.youtube.com');
            console.log('✅ YouTube loaded successfully');

            // Look for video thumbnails or player
            const hasVideos = await ytPage.evaluate(() => {
                return document.querySelectorAll('video, [id*="player"], [class*="video"]').length > 0;
            });

            if (hasVideos) {
                console.log('✅ YouTube video elements detected');
            }

        } catch (error) {
            console.log('❌ YouTube test failed:', error.message);
        }

        await ytContext.close();

    } catch (error) {
        console.error('💥 Test suite failed:', error);
    }

    // Print final results
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    Object.entries(testResults).forEach(([test, passed]) => {
        const status = passed ? '✅ PASS' : '❌ FAIL';
        const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
        console.log(`${status} - ${testName}`);
    });

    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    const successRate = Math.round((passedTests / totalTests) * 100);

    console.log('\n📊 Overall Score: ' + `${passedTests}/${totalTests} (${successRate}%)`);

    if (successRate >= 70) {
        console.log('🎉 STREAMING SETUP IS WORKING! Ready for production use.');
    } else {
        console.log('⚠️  Some issues detected. Check the failed tests above.');
    }

    // Display final statistics
    const finalStats = manager.getStats();
    console.log('\n📈 Final Statistics:');
    console.log(`- Proxy requests: ${finalStats.proxy.requests || 0}`);
    console.log(`- Proxy errors: ${finalStats.proxy.errors || 0}`);
    console.log(`- Media requests: ${finalStats.media.totalRequests || 0}`);
    console.log(`- Active connections: ${finalStats.proxy.activeConnections || 0}`);

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await manager.cleanup();
    console.log('✅ Test suite completed!\n');
}

// Manual test function for interactive testing
async function runManualTest() {
    console.log('🎮 Starting Manual Test Mode\n');

    const socksConfig = {
        host: '103.175.238.8',
        port: 40000,
        auth: {
            username: 'Flirtnetwork',
            password: 'Flirt@67890'
        }
    };

    const manager = new CompleteStreamingManager(socksConfig);

    try {
        await manager.initialize();
        await manager.launchBrowser({ headless: false });

        const context = await manager.createContext();
        const page = await context.newPage();

        console.log('🎯 Browser is ready! You can now:');
        console.log('1. Test streaming on Instagram: https://www.instagram.com');
        console.log('2. Test direct video: https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4');
        console.log('3. Test YouTube: https://www.youtube.com');
        console.log('4. Check your IP: https://httpbin.org/ip');
        console.log('\n⏰ Browser will stay open for 5 minutes for manual testing...');

        // Navigate to a test page
        await manager.navigateWithStreaming(page, 'https://httpbin.org/ip');

        // Keep browser open for manual testing
        await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes

    } catch (error) {
        console.error('❌ Manual test failed:', error);
    } finally {
        await manager.cleanup();
    }
}

// Run tests based on command line argument
if (process.argv.includes('--manual')) {
    runManualTest().catch(console.error);
} else {
    runCompleteTest().catch(console.error);
}

module.exports = { runCompleteTest, runManualTest };
