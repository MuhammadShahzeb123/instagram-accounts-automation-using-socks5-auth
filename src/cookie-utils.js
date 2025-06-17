const CookieManager = require('./cookie-manager');

async function manageCookies() {
    const action = process.argv[2];
    const username = process.argv[3];
    
    const cookieManager = new CookieManager();
    
    switch (action) {
        case 'list':
            console.log('📋 Listing all saved cookies:');
            await cookieManager.listSavedCookies();
            break;
            
        case 'delete':
            if (!username) {
                console.log('❌ Please provide username: node src/cookie-utils.js delete <username>');
                return;
            }
            console.log(`🗑️ Deleting cookies for: ${username}`);
            await cookieManager.deleteCookies(username);
            break;
            
        case 'clean':
            console.log('🧹 Cleaning all saved cookies...');
            const users = await cookieManager.listSavedCookies();
            for (const user of users) {
                await cookieManager.deleteCookies(user);
            }
            console.log('✅ All cookies cleaned');
            break;
            
        default:
            console.log('📖 Cookie Management Utility');
            console.log('');
            console.log('Usage:');
            console.log('  node src/cookie-utils.js list           - List all saved cookies');
            console.log('  node src/cookie-utils.js delete <user>  - Delete cookies for specific user');
            console.log('  node src/cookie-utils.js clean          - Delete all saved cookies');
            console.log('');
            console.log('Examples:');
            console.log('  node src/cookie-utils.js list');
            console.log('  node src/cookie-utils.js delete next.level.aura');
            console.log('  node src/cookie-utils.js clean');
    }
}

if (require.main === module) {
    manageCookies().catch(console.error);
}

module.exports = manageCookies;
