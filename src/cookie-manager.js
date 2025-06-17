const fs = require('fs').promises;
const path = require('path');

class CookieManager {
    constructor(cookiesDir = './cookies') {
        this.cookiesDir = cookiesDir;
        this.ensureCookiesDir();
    }

    /**
     * Ensure cookies directory exists
     */
    async ensureCookiesDir() {
        try {
            await fs.access(this.cookiesDir);
        } catch {
            await fs.mkdir(this.cookiesDir, { recursive: true });
            console.log(`📁 Created cookies directory: ${this.cookiesDir}`);
        }
    }

    /**
     * Get cookie file path for username
     */
    getCookieFilePath(username) {
        return path.join(this.cookiesDir, `${username}.json`);
    }

    /**
     * Save cookies for a user
     */
    async saveCookies(username, context) {
        try {
            const cookies = await context.cookies();
            const cookieFilePath = this.getCookieFilePath(username);
            
            const cookieData = {
                username,
                savedAt: new Date().toISOString(),
                cookies
            };

            await fs.writeFile(cookieFilePath, JSON.stringify(cookieData, null, 2));
            console.log(`🍪 Cookies saved for ${username}: ${cookieFilePath}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to save cookies for ${username}:`, error.message);
            return false;
        }
    }

    /**
     * Load cookies for a user
     */
    async loadCookies(username, context) {
        try {
            const cookieFilePath = this.getCookieFilePath(username);
            
            // Check if cookie file exists
            try {
                await fs.access(cookieFilePath);
            } catch {
                console.log(`ℹ️ No saved cookies found for ${username}`);
                return false;
            }

            const cookieData = JSON.parse(await fs.readFile(cookieFilePath, 'utf8'));
            
            if (cookieData.cookies && cookieData.cookies.length > 0) {
                await context.addCookies(cookieData.cookies);
                console.log(`🍪 Loaded ${cookieData.cookies.length} cookies for ${username}`);
                console.log(`📅 Cookies saved at: ${cookieData.savedAt}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error(`❌ Failed to load cookies for ${username}:`, error.message);
            return false;
        }
    }    /**
     * Check if user is logged in by looking for login indicators on Instagram main page
     */
    async checkLoginStatus(page, username) {
        try {
            console.log(`🔍 Checking login status for ${username}...`);
            
            // Navigate to Instagram main page (not login page to avoid 429)
            await page.goto('https://www.instagram.com/', { 
                waitUntil: 'networkidle',
                timeout: 15000 
            });

            await page.waitForTimeout(3000);

            // Check if "Don't have an account?" text exists (indicates not logged in)
            const pageContent = await page.textContent('body');
            const hasSignupText = pageContent.toLowerCase().includes("don't have an account?");
            
            if (hasSignupText) {
                console.log(`❌ ${username} is not logged in (found signup text)`);
                return false;
            } else {
                console.log(`✅ ${username} is already logged in (no signup text found)`);
                return true;
            }

        } catch (error) {
            console.error(`❌ Failed to check login status for ${username}:`, error.message);
            return false;
        }
    }

    /**
     * Delete cookies for a user
     */
    async deleteCookies(username) {
        try {
            const cookieFilePath = this.getCookieFilePath(username);
            await fs.unlink(cookieFilePath);
            console.log(`🗑️ Deleted cookies for ${username}`);
            return true;
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`❌ Failed to delete cookies for ${username}:`, error.message);
            }
            return false;
        }
    }

    /**
     * List all saved cookie files
     */
    async listSavedCookies() {
        try {
            const files = await fs.readdir(this.cookiesDir);
            const cookieFiles = files.filter(file => file.endsWith('.json'));
            
            console.log(`📋 Found ${cookieFiles.length} saved cookie files:`);
            for (const file of cookieFiles) {
                const username = path.basename(file, '.json');
                console.log(`  - ${username}`);
            }
            
            return cookieFiles.map(file => path.basename(file, '.json'));
        } catch (error) {
            console.error('❌ Failed to list saved cookies:', error.message);
            return [];
        }
    }
}

module.exports = CookieManager;
