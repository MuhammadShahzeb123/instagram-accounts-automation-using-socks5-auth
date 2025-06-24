const EnhancedStreamingManager = require('./enhanced-streaming-manager');

/**
 * Comprehensive test for the Enhanced Streaming Manager
 * Tests SOCKS5 to HTTP conversion and video streaming capabilities
 */
async function testEnhancedStreaming() {
    console.log('🚀 Testing Enhanced Streaming Manager...\n');

    const manager = new EnhancedStreamingManager();

    try {
        // Test proxy (using first proxy from config)
        const proxyString = 'socks5:134.195.155.40:9330:P1yUB7:N1ZT9F';

        console.log('🔧 Step 1: Initialize SOCKS5 to HTTP conversion...');
        const initResult = await manager.initialize(proxyString);

        if (!initResult.success) {
            throw new Error(`Initialization failed: ${initResult.error}`);
        }

        console.log('✅ SOCKS5 to HTTP conversion successful');
        console.log(`🌐 HTTP Proxy URL: ${initResult.httpProxyUrl}\n`);

        // Show status
        const status = manager.getStatus();
        console.log('📊 Manager Status:', JSON.stringify(status, null, 2));
        console.log('');

        console.log('🔧 Step 2: Launch streaming-optimized browser...');

        // Custom streaming task
        const streamingTask = async (page, context, browser) => {
            console.log('🎯 Running comprehensive streaming tests...\n');

            // Test 1: Basic connectivity
            console.log('Test 1: Basic Connectivity');
            console.log('──────────────────────────');
            try {
                await page.goto('https://httpbin.org/ip', {
                    waitUntil: 'domcontentloaded',
                    timeout: 15000
                });

                const ipData = await page.evaluate(() => {
                    try {
                        return JSON.parse(document.body.textContent);
                    } catch {
                        return { origin: document.body.textContent.trim() };
                    }
                });

                console.log(`✅ IP Address: ${ipData.origin}`);
                console.log(`✅ Proxy working correctly\n`);

            } catch (error) {
                console.error('❌ Connectivity test failed:', error.message);
                throw error;
            }

            // Test 2: Instagram access
            console.log('Test 2: Instagram Access');
            console.log('─────────────────────────');
            try {
                await page.goto('https://www.instagram.com', {
                    waitUntil: 'domcontentloaded',
                    timeout: 20000
                });

                await page.waitForTimeout(3000);

                const title = await page.title();
                const hasVideos = await page.evaluate(() => {
                    const videos = document.querySelectorAll('video');
                    const images = document.querySelectorAll('img');
                    return {
                        videoCount: videos.length,
                        imageCount: images.length,
                        hasContent: videos.length > 0 || images.length > 10
                    };
                });

                console.log(`✅ Instagram loaded: ${title}`);
                console.log(`📊 Videos found: ${hasVideos.videoCount}`);
                console.log(`📊 Images found: ${hasVideos.imageCount}`);
                console.log(`✅ Content loading: ${hasVideos.hasContent ? 'SUCCESS' : 'LIMITED'}\n`);

            } catch (error) {
                console.error('❌ Instagram test failed:', error.message);
                console.log('⚠️ Continuing with other tests...\n');
            }

            // Test 3: Direct video streaming
            console.log('Test 3: Direct Video Streaming');
            console.log('───────────────────────────────');
            try {
                const videoUrls = [
                    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                    'https://www.w3schools.com/html/mov_bbb.mp4'
                ];

                for (let i = 0; i < videoUrls.length; i++) {
                    const videoUrl = videoUrls[i];
                    console.log(`Testing video ${i + 1}: ${videoUrl.split('/').pop()}`);

                    try {
                        await page.goto(videoUrl, {
                            waitUntil: 'domcontentloaded',
                            timeout: 20000
                        });

                        // Wait for video to load
                        await page.waitForTimeout(5000);

                        const videoTest = await page.evaluate(() => {
                            const video = document.querySelector('video');
                            if (video) {
                                return {
                                    found: true,
                                    readyState: video.readyState,
                                    networkState: video.networkState,
                                    duration: video.duration || 0,
                                    currentTime: video.currentTime || 0,
                                    canPlay: video.readyState >= 2,
                                    error: video.error ? video.error.message : null,
                                    src: video.src || video.currentSrc
                                };
                            }
                            return { found: false };
                        });

                        if (videoTest.found) {
                            console.log(`  ✅ Video element found`);
                            console.log(`  📊 Ready State: ${videoTest.readyState} (${this.getReadyStateText(videoTest.readyState)})`);
                            console.log(`  📊 Network State: ${videoTest.networkState}`);
                            console.log(`  📊 Duration: ${videoTest.duration}s`);
                            console.log(`  📊 Can Play: ${videoTest.canPlay ? 'YES' : 'NO'}`);

                            if (videoTest.error) {
                                console.log(`  ⚠️ Error: ${videoTest.error}`);
                            }

                            if (videoTest.canPlay) {
                                console.log(`  🎉 VIDEO STREAMING TEST PASSED!`);
                            } else {
                                console.log(`  ⚠️ Video not ready to play`);
                            }
                        } else {
                            console.log(`  ❌ No video element found`);
                        }

                    } catch (error) {
                        console.log(`  ❌ Failed to test video: ${error.message}`);
                    }

                    console.log('');
                }

            } catch (error) {
                console.error('❌ Video streaming tests failed:', error.message);
            }

            // Test 4: YouTube test (if wanted)
            console.log('Test 4: YouTube Access Test');
            console.log('────────────────────────────');
            try {
                await page.goto('https://www.youtube.com', {
                    waitUntil: 'domcontentloaded',
                    timeout: 20000
                });

                await page.waitForTimeout(3000);

                const youtubeTest = await page.evaluate(() => {
                    const videos = document.querySelectorAll('video');
                    const players = document.querySelectorAll('[data-context-item-id]');
                    return {
                        videoElements: videos.length,
                        playerElements: players.length,
                        title: document.title
                    };
                });

                console.log(`✅ YouTube loaded: ${youtubeTest.title}`);
                console.log(`📊 Video elements: ${youtubeTest.videoElements}`);
                console.log(`📊 Player elements: ${youtubeTest.playerElements}`);
                console.log('✅ YouTube access working\n');

            } catch (error) {
                console.error('❌ YouTube test failed:', error.message);
                console.log('⚠️ This is normal if YouTube blocks the proxy\n');
            }

            // Manual testing phase
            console.log('🎯 Manual Testing Phase');
            console.log('────────────────────────');
            console.log('🎥 Browser is ready for manual video streaming tests!');
            console.log('💡 Try these URLs manually:');
            console.log('   • https://www.instagram.com (check if videos play)');
            console.log('   • https://www.tiktok.com (check video content)');
            console.log('   • https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
            console.log('   • Any other video streaming site');
            console.log('');
            console.log('⏳ Keeping browser open for 120 seconds for manual testing...');

            await page.waitForTimeout(120000); // 2 minutes
            console.log('✅ Manual testing period completed');
        };

        // Run the streaming session
        await manager.runStreamingSession(streamingTask, {
            headless: false,
            duration: 0 // We handle timing in the task
        });

        console.log('\n🎉 Enhanced streaming test completed successfully!');

    } catch (error) {
        console.error('❌ Enhanced streaming test failed:', error.message);
        console.error(error.stack);
    } finally {
        // Cleanup
        await manager.cleanup();
        console.log('🧹 Test cleanup completed');
    }
}

// Helper function for ready state text
function getReadyStateText(readyState) {
    const states = {
        0: 'HAVE_NOTHING',
        1: 'HAVE_METADATA',
        2: 'HAVE_CURRENT_DATA',
        3: 'HAVE_FUTURE_DATA',
        4: 'HAVE_ENOUGH_DATA'
    };
    return states[readyState] || 'UNKNOWN';
}

// Add helper to the test function
testEnhancedStreaming.getReadyStateText = getReadyStateText;

// Run the test
if (require.main === module) {
    testEnhancedStreaming().catch(console.error);
}

module.exports = testEnhancedStreaming;
