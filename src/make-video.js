#!/usr/bin/env node

const PortableVideoProcessor = require('./portable-video-processor');

/**
 * Main function to process video based on command line arguments
 */
async function main() {
    try {
        // Get video index from command line arguments
        const videoIndex = process.argv[2];

        if (!videoIndex) {
            console.error('❌ Error: Video index is required!');
            console.log('');
            console.log('Usage: npm run make_video <index>');
            console.log('Example: npm run make_video 1');
            console.log('');
            console.log('Available video indices: 1, 2, 3, 4, 5, 6');
            process.exit(1);
        }

        // Parse and validate video index
        const index = parseInt(videoIndex, 10);
        if (isNaN(index) || index < 1 || index > 5) {
            console.error('❌ Error: Video index must be a number between 1 and 5');
            console.log('Available videos: 1.mp4, 2.mp4, 3.mp4, 4.mp4, 5.mp4');
            process.exit(1);
        }

        console.log('🚀 Starting video processing...');
        console.log(`📋 Video index: ${index}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');        // Initialize video processor and process the video
        const processor = new PortableVideoProcessor();
        const outputPath = await processor.processVideo(index);

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 Video processing completed successfully!');
        console.log(`📁 Processed video saved at: ${outputPath}`);

    } catch (error) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('💥 Video processing failed!');
        console.error(`❌ Error: ${error.message}`);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Run the main function
main();
