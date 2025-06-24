# Video Processing Feature

## Overview
This feature allows you to merge videos with audio tracks, starting the audio from random positions each time. Perfect for creating unique variations of your content!

## Prerequisites

### 1. Install FFmpeg
The script requires FFmpeg to be installed on your system.

**Windows:**
```powershell
# Using chocolatey (recommended)
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

**Alternative Windows Installation:**
1. Download FFmpeg from https://www.gyan.dev/ffmpeg/builds/
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add `C:\ffmpeg\bin` to your system PATH

### 2. Install Node.js Dependencies
```bash
npm install
```

## Usage

### Basic Command
```bash
npm run make_video <video_index>
```

### Examples
```bash
# Process video 1 (1.mp4)
npm run make_video 1

# Process video 3 (3.mp4)
npm run make_video 3

# Process video 5 (5.mp4)
npm run make_video 5
```

## How It Works

1. **Takes a video** from the `videos/` directory (1.mp4, 2.mp4, etc.)
2. **Takes the audio** from `sound/videoplayback.m4a`
3. **Generates a random start time** for the audio
4. **Merges them together** so the audio plays for the entire duration of the video
5. **Saves the result** in the `processed_videos/` directory

## Output

- Processed videos are saved in the `processed_videos/` directory
- Filenames include timestamps to avoid conflicts: `processed_1_2025-06-24T10-30-45-123Z.mp4`
- Original video and audio files remain unchanged

## Features

- ✅ **Random audio start times** - Each run creates a unique combination
- ✅ **Automatic duration matching** - Audio is trimmed to match video length
- ✅ **Progress tracking** - See real-time processing progress
- ✅ **Error handling** - Clear error messages for troubleshooting
- ✅ **File validation** - Checks if input files exist before processing
- ✅ **Automatic directory creation** - Creates `processed_videos/` if it doesn't exist

## Troubleshooting

### "FFmpeg not found" error
- Make sure FFmpeg is installed and added to your system PATH
- Test by running `ffmpeg -version` in your terminal

### "Video file not found" error
- Check that the video index is between 1-5
- Ensure the corresponding `.mp4` file exists in the `videos/` directory

### "Audio file not found" error
- Ensure `videoplayback.m4a` exists in the `sound/` directory

## Technical Details

- **Video Codec**: Copied from original (faster processing)
- **Audio Codec**: AAC (universal compatibility)
- **Duration**: Matches the original video duration
- **Quality**: Preserves original video quality

## File Structure
```
project/
├── videos/
│   ├── 1.mp4
│   ├── 2.mp4
│   ├── 3.mp4
│   ├── 4.mp4
│   └── 5.mp4
├── sound/
│   └── videoplayback.m4a
├── processed_videos/        # Created automatically
│   └── (processed videos)
└── src/
    ├── video-processor.js   # Core processing logic
    └── make-video.js       # CLI interface
```
