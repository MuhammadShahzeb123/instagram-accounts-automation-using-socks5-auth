const InstagramBot = require('./instagram-bot');

async function main() {
    console.log('🚀 Instagram Multi-Account Bot with SOCKS5 Proxy & Cookie Management\n');

    const bot = new InstagramBot();

    // Configuration - Update with your actual data
    const proxyAccountPairs = [
        {
            proxy: 'socks5:134.195.155.40:9330:P1yUB7:N1ZT9F',
            account: {
                username: 'alloyflirtt',
                password: 'ISP2025$'
            }
        },
        {
            proxy: 'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F',
            account: {
                username: 'flirtsync',
                password: 'ISP2025$'
            }
        },
        {
            proxy: 'socks5:134.195.155.182:9136:P1yUB7:N1ZT9F',
            account: {
                username: 'silentflirtt',
                password: 'ISP2025$'
            }
        },
        {
            proxy: 'socks5:38.153.57.54:9458:P1yUB7:N1ZT9F',
            account: {
                username: 'aerorizzz',
                password: 'ISP2025$'
            }
        }
        // {
        //     proxy: 'socks5:38.153.31.217:9794:P1yUB7:N1ZT9F',
        //     account: {
        //         username: 'miragelines',
        //         password: 'ISP2025$'
        //     }
        // }
        // Add more proxy/account pairs here:
        // {
        //     proxy: 'socks5:another.proxy.ip:port:user:pass',
        //     account: {
        //         username: 'another_username',
        //         password: 'another_password'
        //     }
        // },
    ];

    try {
        console.log('📋 Configuration:');
        console.log(`- Number of proxies: ${proxyAccountPairs.length}`);
        console.log(`- Login accounts: ${proxyAccountPairs.filter(p => p.account).length}`);
        console.log(`- Browser mode: Visible (not headless)`);
        console.log(`- Cookies directory: ./cookies\n`);

        const results = await bot.runMultipleInstagramAccounts(proxyAccountPairs, {
            headless: false, // Set to true to run in background
            closeImmediately: false // Keep browsers open to see results
        });

        console.log('\n📊 Instagram automation completed successfully!');
        console.log('📷 Screenshots saved to project directory');
        console.log('🍪 Cookies saved to ./cookies directory');

    } catch (error) {
        console.error('❌ Instagram automation failed:', error.message);
    } finally {
        await bot.cleanup();
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
