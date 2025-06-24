# 🎬 Video Processing Setup Guide

## Quick Setup

### Option 1: Install FFmpeg via Chocolatey (Recommended)

1. **Install Chocolatey** (if not already installed):
   Open PowerShell as Administrator and run:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. **Install FFmpeg**:
   ```powershell
   choco install ffmpeg
   ```

3. **Restart your terminal** and test:
   ```powershell
   ffmpeg -version
   ```

### Option 2: Manual FFmpeg Installation

1. **Download FFmpeg**:
   - Go to: https://www.gyan.dev/ffmpeg/builds/
   - Download the "release build" (latest version)
   - Extract to `C:\ffmpeg`

2. **Add to PATH**:
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab → "Environment Variables"
   - Under "System Variables", find "Path" → "Edit"
   - Click "New" and add: `C:\ffmpeg\bin`
   - Click "OK" on all dialogs

3. **Restart your terminal** and test:
   ```powershell
   ffmpeg -version
   ```

### Option 3: Use Portable FFmpeg (No Installation)

If you can't install FFmpeg system-wide, you can use a portable version:

1. **Download portable FFmpeg**:
   - Go to: https://www.gyan.dev/ffmpeg/builds/
   - Download and extract to your project folder

2. **Update the video processor** to use the portable executable

## Usage After Setup

Once FFmpeg is installed:

```bash
# Install project dependencies
npm install

# Process a video (replace 1 with your desired video index 1-5)
npm run make_video 1
```

## Test Your Setup

Run this command to verify everything is working:
```bash
npm run make_video 1
```

If successful, you'll see:
- ✅ Processing messages
- ⏳ Progress percentage
- 🎉 Success message
- 📁 Output file location

## Troubleshooting

### "FFmpeg not found" error
- Make sure you've restarted your terminal after installation
- Try running `ffmpeg -version` to verify installation
- Check that FFmpeg is in your system PATH

### "fluent-ffmpeg not found" error
- Run `npm install` in the project directory

### Permission errors
- Run PowerShell as Administrator for Chocolatey installation
- Or use the manual installation method

## Need Help?

If you encounter any issues:
1. Check that all video files (1.mp4 - 5.mp4) exist in the `videos/` folder
2. Verify `videoplayback.m4a` exists in the `sound/` folder
3. Ensure FFmpeg is properly installed
4. Try running the commands in a fresh terminal window
