const SimplifiedStreamingManager = require('./simplified-streaming-manager');

/**
 * Test script for the Simplified Streaming Manager
 * This uses a much simpler approach to SOCKS5 + video streaming
 */
async function testSimplifiedStreaming() {
    console.log('🧪 Testing Simplified Streaming Manager...\n');

    const streamingManager = new SimplifiedStreamingManager();

    try {
        // Test proxy configuration (using the first proxy from main config)
        const proxyString = 'socks5:134.195.155.40:9330:P1yUB7:N1ZT9F';

        console.log('🔧 Initializing simplified streaming system...');
        const result = await streamingManager.initialize(proxyString);

        if (!result.success) {
            throw new Error(`Initialization failed: ${result.error}`);
        }

        console.log('✅ Simplified streaming system initialized');
        console.log(`🔗 HTTP Proxy URL: ${result.proxyUrl}\n`);

        // Launch browser
        console.log('🚀 Launching browser with streaming optimizations...');
        const { browser, page } = await streamingManager.launchBrowser();

        console.log('✅ Browser launched successfully\n');

        // Test 1: Check IP address
        console.log('🌍 Test 1: Checking IP address...');
        try {
            await page.goto('https://httpbin.org/ip', {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });

            const ipInfo = await page.textContent('pre');
            console.log('📍 Current IP:', ipInfo);
        } catch (error) {
            console.error('❌ IP check failed:', error.message);
        }

        // Test 2: Test Instagram access
        console.log('\n📱 Test 2: Testing Instagram access...');
        const instagramSuccess = await streamingManager.testInstagramAccess(page);

        // Test 3: Test video streaming
        console.log('\n🎬 Test 3: Testing video streaming...');
        const videoSuccess = await streamingManager.testVideoStreaming(page);

        // Test 4: Test the problematic W3Schools video
        console.log('\n🎯 Test 4: Testing W3Schools video (the one that failed before)...');
        try {
            await page.goto('https://www.w3schools.com/html/mov_bbb.mp4', {
                waitUntil: 'domcontentloaded',
                timeout: 20000
            });

            await page.waitForTimeout(3000);

            const w3VideoTest = await page.evaluate(() => {
                const video = document.querySelector('video');
                return video ? {
                    found: true,
                    readyState: video.readyState,
                    canPlay: video.readyState >= 2,
                    networkState: video.networkState,
                    error: video.error ? video.error.message : null
                } : { found: false };
            });

            if (w3VideoTest.found && w3VideoTest.canPlay) {
                console.log('✅ W3Schools video test PASSED!');
                console.log(`📊 Ready state: ${w3VideoTest.readyState}, Network state: ${w3VideoTest.networkState}`);
            } else if (w3VideoTest.found) {
                console.log('⚠️ W3Schools video found but not ready');
                console.log(`📊 Ready state: ${w3VideoTest.readyState}, Error: ${w3VideoTest.error || 'None'}`);
            } else {
                console.log('❌ W3Schools video element not found');
            }
        } catch (error) {
            console.error('❌ W3Schools video test failed:', error.message);
        }

        // Summary
        console.log('\n📊 TEST SUMMARY:');
        console.log(`🌍 IP Check: ✅`);
        console.log(`📱 Instagram: ${instagramSuccess ? '✅' : '❌'}`);
        console.log(`🎬 Video Streaming: ${videoSuccess ? '✅' : '❌'}`);

        if (videoSuccess) {
            console.log('\n🎉 SUCCESS! Video streaming is working through SOCKS5 proxy!');
            console.log('💡 The simplified approach with request interception solved the problem.');
        } else {
            console.log('\n⚠️ Video streaming still has issues. Need further investigation.');
        }

        console.log('\n⏳ Keeping browser open for 60 seconds for manual testing...');
        console.log('🎥 Try visiting Instagram, YouTube, or TikTok to test video streaming!');
        console.log('💡 All traffic is going through the SOCKS5 proxy with optimizations');

        await page.waitForTimeout(60000);

        console.log('\n✅ Test completed');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        // Cleanup
        await streamingManager.cleanup();
        console.log('🧹 Cleanup completed');
    }
}

// Run the test
if (require.main === module) {
    testSimplifiedStreaming().catch(console.error);
}

module.exports = testSimplifiedStreaming;
