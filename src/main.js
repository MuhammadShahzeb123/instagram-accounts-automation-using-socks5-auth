const InstagramAutomation = require('./instagram-automation');

async function main() {
    console.log('🚀 Instagram Multi-Account Automation with SOCKS5 Proxy\n');
    
    const instagram = new InstagramAutomation();
    
    // Configuration - Update with your actual data
    const proxyAccountPairs = [
        {
            proxy: 'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F',
            account: null // Set to null for no login, or add {username: 'user', password: 'pass'}
        }
        // Add more proxy/account pairs here:
        // {
        //     proxy: 'socks5:another.proxy.ip:port:user:pass',
        //     account: {
        //         username: 'your_instagram_username',
        //         password: 'your_instagram_password'
        //     }
        // },
    ];

    try {
        console.log('📋 Configuration:');
        console.log(`- Number of proxies: ${proxyAccountPairs.length}`);
        console.log(`- Login accounts: ${proxyAccountPairs.filter(p => p.account).length}`);
        console.log(`- Browser mode: Visible (not headless)\n`);

        const results = await instagram.runMultipleInstagramAccounts(proxyAccountPairs, {
            headless: false, // Set to true to run in background
            closeImmediately: false // Keep browsers open to see results
        });
        
        console.log('\n📊 Instagram automation completed successfully!');
        console.log('📷 Screenshots saved to project directory');
        
    } catch (error) {
        console.error('❌ Instagram automation failed:', error.message);
    } finally {
        await instagram.cleanup();
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the main function if this file is executed directly
main().catch(console.error);
