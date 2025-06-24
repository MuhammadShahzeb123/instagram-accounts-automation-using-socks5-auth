const StreamingDiagnostics = require('./streaming-diagnostics');
const UploadManager = require('./upload');

class StreamingTestSuite {
    constructor() {
        this.diagnostics = new StreamingDiagnostics();
        this.uploadManager = new UploadManager();
    }

    /**
     * Run comprehensive streaming tests for all accounts
     */
    async testAllAccounts() {
        console.log('🎥 COMPREHENSIVE STREAMING TEST SUITE');
        console.log('='.repeat(50));
        console.log('');

        const proxyAccountPairs = this.uploadManager.getProxyAccountPairs();
        const results = [];

        for (let i = 0; i < proxyAccountPairs.length; i++) {
            const accountIndex = i + 1;
            const pair = proxyAccountPairs[i];

            console.log(`🧪 Testing Account ${accountIndex}/${proxyAccountPairs.length}: ${pair.account.username}`);
            console.log('-'.repeat(40));

            try {
                const result = await this.diagnostics.quickStreamingTest(accountIndex, proxyAccountPairs);
                results.push({
                    accountIndex,
                    account: pair.account.username,
                    proxy: pair.proxy,
                    result,
                    success: true
                });
            } catch (error) {
                console.error(`❌ Test failed for account ${accountIndex}:`, error.message);
                results.push({
                    accountIndex,
                    account: pair.account.username,
                    proxy: pair.proxy,
                    error: error.message,
                    success: false
                });
            }

            console.log('');

            // Small delay between tests
            if (i < proxyAccountPairs.length - 1) {
                console.log('⏳ Waiting 5 seconds before next test...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        this.printTestSummary(results);
        return results;
    }

    /**
     * Test specific streaming platform for an account
     */
    async testPlatformForAccount(accountIndex, platform) {
        const proxyAccountPairs = this.uploadManager.getProxyAccountPairs();

        if (accountIndex < 1 || accountIndex > proxyAccountPairs.length) {
            console.error(`❌ Invalid account index: ${accountIndex}`);
            return;
        }

        const pair = proxyAccountPairs[accountIndex - 1];
        console.log(`🎯 Testing ${platform.toUpperCase()} for ${pair.account.username}`);
        console.log('-'.repeat(40));

        // This would be expanded to test specific platforms
        const result = await this.diagnostics.quickStreamingTest(accountIndex, proxyAccountPairs);

        // Extract platform-specific results
        const platformResult = result.tests.streamingPlatforms.details[platform.toLowerCase()];

        if (platformResult) {
            console.log(`📊 ${platform.toUpperCase()} Results:`);
            console.log(`   Accessible: ${platformResult.accessible ? '✅ Yes' : '❌ No'}`);
            console.log(`   Load Time: ${platformResult.loadTime}ms`);
            if (platformResult.errors.length > 0) {
                console.log(`   Errors: ${platformResult.errors.join(', ')}`);
            }
        }

        return platformResult;
    }

    /**
     * Find best account for streaming
     */
    async findBestStreamingAccount() {
        console.log('🏆 FINDING BEST STREAMING ACCOUNT');
        console.log('='.repeat(40));
        console.log('');

        const results = await this.testAllAccounts();
        const workingAccounts = results.filter(r => r.success && r.result.tests.streamingPlatforms.status !== 'failed');

        if (workingAccounts.length === 0) {
            console.log('❌ No accounts found suitable for streaming!');
            return null;
        }

        // Score accounts based on performance
        const scoredAccounts = workingAccounts.map(account => {
            let score = 0;
            const tests = account.result.tests;

            // Basic connection (30%)
            if (tests.basicConnection.status === 'passed') score += 30;

            // Video codecs (20%)
            if (tests.videoCodecs.status === 'passed') score += 20;

            // Streaming platforms (40%)
            if (tests.streamingPlatforms.status === 'passed') score += 40;
            else if (tests.streamingPlatforms.status === 'partial') score += 20;

            // Media playback (10%)
            if (tests.mediaPlayback.status === 'passed') score += 10;

            return { ...account, score };
        });

        // Sort by score (highest first)
        scoredAccounts.sort((a, b) => b.score - a.score);

        console.log('🏅 STREAMING ACCOUNT RANKINGS:');
        console.log('-'.repeat(30));

        scoredAccounts.forEach((account, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
            console.log(`${medal} #${account.accountIndex} ${account.account}: ${account.score}/100 points`);
        });

        const bestAccount = scoredAccounts[0];
        console.log('');
        console.log(`🎉 BEST STREAMING ACCOUNT: #${bestAccount.accountIndex} ${bestAccount.account}`);
        console.log(`🏆 Score: ${bestAccount.score}/100 points`);

        return bestAccount;
    }

    /**
     * Print test summary
     */
    printTestSummary(results) {
        console.log('📊 STREAMING TEST SUMMARY');
        console.log('='.repeat(50));

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        console.log(`✅ Successful tests: ${successful.length}/${results.length}`);
        console.log(`❌ Failed tests: ${failed.length}/${results.length}`);
        console.log('');

        if (successful.length > 0) {
            console.log('✅ WORKING ACCOUNTS:');
            successful.forEach(account => {
                const streamingStatus = account.result.tests.streamingPlatforms.status;
                const statusIcon = streamingStatus === 'passed' ? '🎥' :
                                 streamingStatus === 'partial' ? '⚠️' : '❌';
                console.log(`   ${statusIcon} #${account.accountIndex} ${account.account}`);
            });
            console.log('');
        }

        if (failed.length > 0) {
            console.log('❌ FAILED ACCOUNTS:');
            failed.forEach(account => {
                console.log(`   💥 #${account.accountIndex} ${account.account}: ${account.error}`);
            });
            console.log('');
        }

        // Recommendations
        if (successful.length === 0) {
            console.log('🚨 CRITICAL: No accounts can stream videos!');
            console.log('💡 Try:');
            console.log('   - Check proxy servers are working');
            console.log('   - Test with different proxy providers');
            console.log('   - Use standard mode: npm run upload standard <account>');
        } else if (successful.length < results.length) {
            console.log('⚠️  Some accounts have streaming issues');
            console.log('💡 Use working accounts for video streaming operations');
        } else {
            console.log('🎉 All accounts support video streaming!');
        }

        console.log('='.repeat(50));
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const accountIndex = parseInt(args[1]);
    const platform = args[2];

    const testSuite = new StreamingTestSuite();

    try {
        switch (command) {
            case 'all':
                await testSuite.testAllAccounts();
                break;

            case 'best':
                await testSuite.findBestStreamingAccount();
                break;

            case 'account':
                if (isNaN(accountIndex)) {
                    console.error('❌ Please provide account index: npm run streaming-test account <index>');
                    process.exit(1);
                }
                await testSuite.diagnostics.quickStreamingTest(accountIndex, testSuite.uploadManager.getProxyAccountPairs());
                break;

            case 'platform':
                if (isNaN(accountIndex) || !platform) {
                    console.error('❌ Usage: npm run streaming-test platform <account_index> <platform>');
                    console.error('🎯 Platforms: youtube, instagram, tiktok');
                    process.exit(1);
                }
                await testSuite.testPlatformForAccount(accountIndex, platform);
                break;

            default:
                console.error('❌ Usage:');
                console.error('📝 npm run streaming-test all                    - Test all accounts');
                console.error('📝 npm run streaming-test best                   - Find best streaming account');
                console.error('📝 npm run streaming-test account <index>       - Test specific account');
                console.error('📝 npm run streaming-test platform <index> <platform> - Test specific platform');
                console.error('');
                console.error('🎯 Examples:');
                console.error('   npm run streaming-test all');
                console.error('   npm run streaming-test account 2');
                console.error('   npm run streaming-test platform 1 youtube');
                process.exit(1);
        }
    } catch (error) {
        console.error('❌ Streaming test failed:', error.message);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = StreamingTestSuite;
