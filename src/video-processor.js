const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs').promises;

class VideoProcessor2 {
    constructor() {
        this.videosDir = path.join(__dirname, '..', 'videos');
        this.soundDir = path.join(__dirname, '..', 'sound');
        this.outputDir = path.join(__dirname, '..', 'processed_videos');
        this.audioFile = path.join(this.soundDir, 'videoplayback.m4a');
    }

    /**
     * Ensures the processed_videos directory exists
     */
    async ensureOutputDirectory() {
        try {
            await fs.access(this.outputDir);
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.mkdir(this.outputDir, { recursive: true });
                console.log('✅ Created processed_videos directory');
            } else {
                throw error;
            }
        }
    }    /**
     * Gets detailed metadata for an audio file
     * @param {string} audioPath - Path to the audio file
     * @returns {Promise<object>} Audio metadata including codec, bitrate, sample rate
     */
    async getAudioMetadata(audioPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(audioPath, (err, metadata) => {
                if (err) {
                    reject(err);
                    return;
                }

                const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
                if (!audioStream) {
                    reject(new Error('No audio stream found'));
                    return;
                }

                resolve({
                    codec: audioStream.codec_name,
                    bitrate: audioStream.bit_rate,
                    sampleRate: audioStream.sample_rate,
                    channels: audioStream.channels,
                    duration: metadata.format.duration
                });
            });
        });
    }

    /**
     * Gets the duration of an audio file in seconds
     * @param {string} audioPath - Path to the audio file
     * @returns {Promise<number>} Duration in seconds
     */
    async getAudioDuration(audioPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(audioPath, (err, metadata) => {
                if (err) {
                    reject(err);
                    return;
                }
                const duration = metadata.format.duration;
                resolve(duration);
            });
        });
    }

    /**
     * Gets the duration of a video file in seconds
     * @param {string} videoPath - Path to the video file
     * @returns {Promise<number>} Duration in seconds
     */
    async getVideoDuration(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    reject(err);
                    return;
                }
                const duration = metadata.format.duration;
                resolve(duration);
            });
        });
    }

    /**
     * Generates a random start time for the audio
     * @param {number} audioDuration - Total duration of audio in seconds
     * @param {number} videoDuration - Duration of video in seconds
     * @returns {number} Random start time in seconds
     */
    generateRandomAudioStart(audioDuration, videoDuration) {
        // Ensure we have enough audio to cover the entire video
        if (audioDuration < videoDuration) {
            console.warn(`⚠️  Audio duration (${audioDuration}s) is shorter than video duration (${videoDuration}s)`);
            return 0;
        }

        // Generate random start time ensuring we have enough audio left
        const maxStartTime = audioDuration - videoDuration;
        return Math.random() * maxStartTime;
    }

    /**
     * Processes a video by merging it with audio from a random starting point
     * @param {number} videoIndex - Index of the video (1-based)
     * @returns {Promise<string>} Path to the processed video
     */
    async processVideo(videoIndex) {
        try {
            // Validate input
            if (!videoIndex || videoIndex < 1) {
                throw new Error('Video index must be a positive number starting from 1');
            }

            const videoFileName = `${videoIndex}.mp4`;
            const videoPath = path.join(this.videosDir, videoFileName);

            // Check if video file exists
            try {
                await fs.access(videoPath);
            } catch (error) {
                throw new Error(`Video file ${videoFileName} not found in videos directory`);
            }

            // Check if audio file exists
            try {
                await fs.access(this.audioFile);
            } catch (error) {
                throw new Error(`Audio file not found: ${this.audioFile}`);
            }

            // Ensure output directory exists
            await this.ensureOutputDirectory();            console.log(`🎬 Processing video: ${videoFileName}`);
            console.log(`🎵 Using audio: ${path.basename(this.audioFile)}`);

            // Get durations and audio metadata
            const videoDuration = await this.getVideoDuration(videoPath);
            const audioDuration = await this.getAudioDuration(this.audioFile);
            const audioMetadata = await this.getAudioMetadata(this.audioFile);

            console.log(`📹 Video duration: ${videoDuration.toFixed(2)}s`);
            console.log(`🎵 Audio duration: ${audioDuration.toFixed(2)}s`);
            console.log(`🎧 Audio format: ${audioMetadata.codec} | ${audioMetadata.bitrate ? Math.round(audioMetadata.bitrate/1000) + 'kbps' : 'Unknown bitrate'} | ${audioMetadata.sampleRate}Hz`);

            // Generate random audio start time
            const audioStartTime = this.generateRandomAudioStart(audioDuration, videoDuration);
            console.log(`🎲 Random audio start time: ${audioStartTime.toFixed(2)}s`);

            // Generate output filename with timestamp to avoid conflicts
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const outputFileName = `processed_${videoIndex}_${timestamp}.mp4`;
            const outputPath = path.join(this.outputDir, outputFileName);

            // Process video with ffmpeg
            await this.mergeVideoWithAudio(videoPath, this.audioFile, outputPath, audioStartTime, videoDuration, audioMetadata);

            console.log(`✅ Successfully processed video!`);
            console.log(`📁 Output saved to: ${outputPath}`);

            return outputPath;

        } catch (error) {
            console.error(`❌ Error processing video:`, error.message);
            throw error;
        }
    }    /**
     * Merges video with audio using ffmpeg with high-quality audio preservation
     * @param {string} videoPath - Path to input video
     * @param {string} audioPath - Path to input audio
     * @param {string} outputPath - Path for output video
     * @param {number} audioStartTime - Start time for audio in seconds
     * @param {number} videoDuration - Duration of video in seconds
     * @param {object} audioMetadata - Original audio metadata for quality preservation
     * @returns {Promise<void>}
     */
    async mergeVideoWithAudio(videoPath, audioPath, outputPath, audioStartTime, videoDuration, audioMetadata) {
        return new Promise((resolve, reject) => {
            // Determine best audio codec strategy
            let audioCodecOptions = [];

            // Try to preserve original audio quality
            if (audioMetadata.codec === 'aac' && audioMetadata.bitrate) {
                // Original is AAC, copy it for best quality
                audioCodecOptions = ['-c:a copy'];
                console.log('🎵 Using audio copy mode (best quality)');
            } else {
                // High-quality AAC encoding with original bitrate or high default
                const bitrate = audioMetadata.bitrate ? Math.max(128000, audioMetadata.bitrate) : 256000;
                audioCodecOptions = [
                    '-c:a aac',
                    `-b:a ${bitrate}`,
                    `-ar ${audioMetadata.sampleRate || 48000}`, // Preserve or use high sample rate
                    '-ac 2' // Stereo
                ];
                console.log(`🎵 Using high-quality AAC encoding (${Math.round(bitrate/1000)}kbps @ ${audioMetadata.sampleRate || 48000}Hz)`);
            }

            ffmpeg()
                .input(videoPath)
                .input(audioPath)
                .seekInput(audioStartTime) // Seek to random position in audio
                .outputOptions([
                    '-map 0:v:0',    // Map video stream from first input
                    '-map 1:a:0',    // Map audio stream from second input
                    '-c:v copy',     // Copy video codec (faster)
                    ...audioCodecOptions, // Dynamic audio options for quality
                    '-shortest',     // Stop when shortest input ends
                    `-t ${videoDuration}`, // Limit duration to video length
                    '-avoid_negative_ts make_zero', // Handle potential timestamp issues
                    '-movflags +faststart' // Optimize for web playback
                ])
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log('🔄 FFmpeg process started...');
                    console.log('Command:', commandLine);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        process.stdout.write(`\r⏳ Progress: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('end', () => {
                    console.log('\n🎉 FFmpeg process completed successfully!');
                    resolve();
                })
                .on('error', (err) => {
                    console.log('\n❌ FFmpeg process failed:', err.message);
                    // If copy mode fails, try high-quality re-encoding
                    if (err.message.includes('copy') || err.message.includes('codec')) {
                        console.log('⚠️  Copy mode failed, trying high-quality re-encoding...');
                        this.mergeVideoWithAudioFallback(videoPath, audioPath, outputPath, audioStartTime, videoDuration, audioMetadata)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        reject(err);
                    }
                })
                .run();
        });
    }

    /**
     * Fallback method for audio merging with guaranteed compatibility
     * @param {string} videoPath - Path to input video
     * @param {string} audioPath - Path to input audio
     * @param {string} outputPath - Path for output video
     * @param {number} audioStartTime - Start time for audio in seconds
     * @param {number} videoDuration - Duration of video in seconds
     * @param {object} audioMetadata - Original audio metadata
     * @returns {Promise<void>}
     */
    async mergeVideoWithAudioFallback(videoPath, audioPath, outputPath, audioStartTime, videoDuration, audioMetadata) {
        return new Promise((resolve, reject) => {
            // High-quality fallback encoding
            const bitrate = audioMetadata.bitrate ? Math.max(192000, audioMetadata.bitrate) : 320000;

            console.log(`🔄 Fallback: High-quality AAC encoding (${Math.round(bitrate/1000)}kbps)`);

            ffmpeg()
                .input(videoPath)
                .input(audioPath)
                .seekInput(audioStartTime)
                .outputOptions([
                    '-map 0:v:0',
                    '-map 1:a:0',
                    '-c:v copy',
                    '-c:a aac',
                    `-b:a ${bitrate}`,
                    `-ar ${audioMetadata.sampleRate || 48000}`,
                    '-ac 2',
                    '-shortest',
                    `-t ${videoDuration}`,
                    '-avoid_negative_ts make_zero',
                    '-movflags +faststart'
                ])
                .output(outputPath)
                .on('start', (commandLine) => {
                    console.log('Command:', commandLine);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        process.stdout.write(`\r⏳ Fallback Progress: ${Math.round(progress.percent)}%`);
                    }
                })
                .on('end', () => {
                    console.log('\n🎉 Fallback encoding completed successfully!');
                    resolve();
                })
                .on('error', (err) => {
                    console.log('\n❌ Fallback encoding failed:', err.message);
                    reject(err);
                })
                .run();
        });
    }
}

module.exports = VideoProcessor2;
