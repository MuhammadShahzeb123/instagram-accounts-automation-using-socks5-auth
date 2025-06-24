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
    }    /**
     * Save cookies for a user - Save everything the browser has
     */
    async saveCookies(username, context) {
        try {
            const cookies = await context.cookies();
            const cookieFilePath = this.getCookieFilePath(username);

            // Just save the raw cookies array - no fancy formatting
            await fs.writeFile(cookieFilePath, JSON.stringify(cookies, null, 2));
            console.log(`🍪 Cookies saved for ${username}: ${cookieFilePath}`);
            console.log(`📊 Saved ${cookies.length} cookies`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to save cookies for ${username}:`, error.message);
            return false;
        }
    }    /**
     * Load cookies for a user - Load everything back as-is
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

            const fileContent = await fs.readFile(cookieFilePath, 'utf8');
            const cookies = JSON.parse(fileContent);

            // Just load whatever is in the file - but fix sameSite values for Playwright
            if (Array.isArray(cookies) && cookies.length > 0) {
                console.log(`🔍 Fixing ${cookies.length} cookies for ${username}...`);

                // Fix sameSite values to be compatible with Playwright
                const fixedCookies = cookies.map((cookie, index) => {
                    const fixedCookie = { ...cookie };                    console.log(`Cookie ${index}: name=${cookie.name}, sameSite=${cookie.sameSite}, expirationDate=${cookie.expirationDate}, session=${cookie.session}`);

                    // Fix ALL possible sameSite values
                    if (fixedCookie.sameSite === 'no_restriction' ||
                        fixedCookie.sameSite === 'unspecified' ||
                        fixedCookie.sameSite === 'none') {
                        fixedCookie.sameSite = 'None';
                    } else if (fixedCookie.sameSite === null ||
                               fixedCookie.sameSite === undefined ||
                               fixedCookie.sameSite === '' ||
                               !['Strict', 'Lax', 'None'].includes(fixedCookie.sameSite)) {
                        fixedCookie.sameSite = 'Lax';
                    }
                    // Keep 'Strict', 'Lax', 'None' as-is

                    console.log(`Fixed sameSite to: ${fixedCookie.sameSite}`);

                    // Fix expires timestamp - handle session cookies properly
                    if (cookie.session === true) {
                        // This is a session cookie - don't set expires
                        delete fixedCookie.expires;
                        delete fixedCookie.expirationDate;
                        console.log(`Session cookie - no expires set`);
                    } else if (fixedCookie.expirationDate) {
                        // Convert to seconds (already in seconds, just remove decimals)
                        const expiresSeconds = Math.floor(Number(fixedCookie.expirationDate));
                        if (expiresSeconds > 0 && expiresSeconds < 2147483647) { // Max 32-bit int
                            fixedCookie.expires = expiresSeconds;
                            console.log(`Set expires to: ${expiresSeconds}`);
                        } else {
                            console.log(`Invalid expiration ${expiresSeconds}, making session cookie`);
                            delete fixedCookie.expires;
                        }
                        delete fixedCookie.expirationDate;
                    }

                    // Remove properties that Playwright doesn't need
                    delete fixedCookie.hostOnly;
                    delete fixedCookie.session;
                    delete fixedCookie.storeId;

                    return fixedCookie;
                });

                await context.addCookies(fixedCookies);
                console.log(`🍪 Loaded ${fixedCookies.length} cookies for ${username}`);
                return true;
            }

            console.log(`❌ No valid cookies found for ${username}`);
            return false;
        } catch (error) {
            console.error(`❌ Failed to load cookies for ${username}:`, error.message);
            return false;
        }
    }/**
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
