const HybridProxyManager = require('./hybrid-proxy-manager');
const { chromium } = require('playwright');

/**
 * Quick test script for the Hybrid Proxy Manager
 * Tests video streaming through the hybrid proxy system
 */
async function testHybridProxy() {
    console.log('🧪 Testing Hybrid Proxy Manager...\n');

    const hybridManager = new HybridProxyManager();

    try {
        // Test proxy configuration (using the first proxy from main config)
        const proxyConfig = {
            host: '134.195.155.40',
            port: 9330,
            auth: {
                username: 'P1yUB7',
                password: 'N1ZT9F'
            }
        };

        console.log('🔧 Initializing hybrid proxy system...');
        const result = await hybridManager.initialize(proxyConfig);

        if (!result.success) {
            throw new Error(`Initialization failed: ${result.error}`);
        }

        console.log('✅ Hybrid proxy initialized successfully');
        console.log(`🔗 Local proxy URL: ${result.localProxyUrl}\n`);
          // Launch browser with hybrid proxy
        console.log('🌐 Launching browser with hybrid proxy...');
        const browserOptions = {
            headless: false,
            ...hybridManager.getBrowserLaunchOptions()
        };
          const browser = await chromium.launch(browserOptions);
        const page = await browser.newPage();

        // Set viewport and user agent (Playwright syntax)
        await page.setViewportSize({ width: 1366, height: 768 });
        await page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        // Setup request interception
        await hybridManager.setupRequestInterception(page);

        console.log('✅ Browser launched successfully\n');

        // Test 1: Check IP address
        console.log('🌍 Test 1: Checking IP address...');
        try {
            await page.goto('https://httpbin.org/ip', { waitUntil: 'domcontentloaded', timeout: 15000 });
            const ipInfo = await page.evaluate(() => document.body.textContent);
            console.log('📍 Current IP:', ipInfo);
        } catch (error) {
            console.error('❌ IP check failed:', error.message);
        }

        // Test 2: Test Instagram access
        console.log('\n📱 Test 2: Testing Instagram access...');
        try {
            await page.goto('https://www.instagram.com', {
                waitUntil: 'domcontentloaded',
                timeout: 20000
            });

            await page.waitForTimeout(3000);

            const title = await page.title();
            console.log('📱 Instagram page title:', title);

            if (title.includes('Instagram')) {
                console.log('✅ Instagram access successful');
            } else {
                console.log('⚠️ Instagram access uncertain');
            }
        } catch (error) {
            console.error('❌ Instagram access failed:', error.message);
        }

        // Test 3: Test direct video streaming
        console.log('\n🎬 Test 3: Testing direct video streaming...');
        try {
            const videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
            await page.goto(videoUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 20000
            });

            await page.waitForTimeout(2000);

            const videoTest = await page.evaluate(() => {
                const video = document.querySelector('video');
                if (video) {
                    return {
                        found: true,
                        readyState: video.readyState,
                        duration: video.duration,
                        canPlay: video.readyState >= 2
                    };
                }
                return { found: false };
            });

            if (videoTest.found && videoTest.canPlay) {
                console.log('✅ Direct video streaming test PASSED');
                console.log(`📊 Video duration: ${videoTest.duration}s, Ready state: ${videoTest.readyState}`);
            } else if (videoTest.found) {
                console.log('⚠️ Video element found but not ready to play');
                console.log(`📊 Ready state: ${videoTest.readyState}`);
            } else {
                console.log('❌ No video element found');
            }
        } catch (error) {
            console.error('❌ Video streaming test failed:', error.message);
        }

        console.log('\n⏳ Keeping browser open for 60 seconds for manual testing...');
        console.log('🎥 You can now test video streaming manually!');
        console.log('💡 Try visiting YouTube, Instagram, TikTok, or any video site');

        await page.waitForTimeout(60000);

        console.log('\n✅ Test completed successfully');

        await browser.close();

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        // Cleanup
        await hybridManager.cleanup();
        console.log('🧹 Cleanup completed');
    }
}

// Run the test
if (require.main === module) {
    testHybridProxy().catch(console.error);
}

module.exports = testHybridProxy;
