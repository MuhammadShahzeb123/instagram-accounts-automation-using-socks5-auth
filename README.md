# Instagram Accounts Handling with SOCKS5 Proxies

A powerful Node.js automation script using Playwright that supports multiple SOCKS5 proxies with authentication for running concurrent browser sessions.

## Features

- ✅ SOCKS5 proxy support with username/password authentication
- ✅ Multiple concurrent browser sessions
- ✅ Proxy rotation and management
- ✅ Error handling and retry logic
- ✅ Cookie management for different sessions
- ✅ Stealth browsing capabilities
- ✅ Instagram automation ready

## Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install-browsers
```

## Proxy Format

Use proxies in this format: `IP:PORT:USERNAME:PASSWORD`

Example: `134.195.152.111:9234:P1yUB7:N1ZT9F`

## Usage

### 1. Upload Mode (NEW!)

Spawn browsers with a specific number of accounts for manual use:

```bash
# Use 1 account
npm run upload 1

# Use 3 accounts
npm run upload 3

# Use all 5 accounts
npm run upload 5
```

**What Upload Mode Does:**
- ✅ Spawns browsers with proxies configured
- ✅ Loads saved cookies automatically
- ✅ Logs in if cookies are available
- ✅ Keeps browsers open for manual use
- ✅ Saves cookies when you press Ctrl+C
- ✅ Perfect for manual Instagram management

### 2. Basic Testing

Test a single proxy:
```bash
npm test single
```

Test multiple proxies:
```bash
npm test multiple
```

### 3. Main Script

Run the main automation script:
```bash
npm start
```

### 3. Custom Automation

Edit the `exampleAutomationTask` function in `src/main.js` to customize your automation logic:

```javascript
async function exampleAutomationTask(page, context, taskId) {
    // Your custom automation logic here

    // Example: Instagram login
    await page.goto('https://www.instagram.com/');
    await page.fill('input[name="username"]', 'your_username');
    await page.fill('input[name="password"]', 'your_password');
    await page.click('button[type="submit"]');

    // Add cookies for session persistence
    await context.addCookies([
        { name: 'sessionid', value: 'session_value', domain: '.instagram.com', path: '/' }
    ]);

    return { status: 'success' };
}
```

## Configuration

### Proxy List

Add your proxies to the `proxyList` array in `src/main.js`:

```javascript
const proxyList = [
    'socks5:134.195.152.111:9234:P1yUB7:N1ZT9F',
    'socks5:IP2:PORT2:USER2:PASS2',
    'socks5:IP3:PORT3:USER3:PASS3',
    // Add more proxies...
];
```

### Concurrency Settings

Adjust the number of concurrent sessions in the options:

```javascript
const results = await proxyManager.runMultipleProxies(
    workingProxies,
    exampleAutomationTask,
    { maxConcurrent: 5 } // Adjust based on your system capacity
);
```

## API Reference

### ProxyManager Class

#### Methods

- `parseProxy(proxyString)` - Parse proxy string format
- `createBrowserWithProxy(proxyString, options)` - Create browser with proxy
- `testProxy(proxyString)` - Test if proxy is working
- `runMultipleProxies(proxyList, automationTask, options)` - Run automation on multiple proxies
- `cleanup()` - Clean up all browser instances

### Example Automation Tasks

#### Instagram Login
```javascript
async function instagramLogin(page, context, taskId) {
    await page.goto('https://www.instagram.com/');
    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    return { loggedIn: true };
}
```

#### Like Posts
```javascript
async function likePosts(page, context, taskId) {
    await page.goto('https://www.instagram.com/explore/');
    const likeButtons = await page.$$('button[aria-label="Like"]');

    for (let i = 0; i < Math.min(5, likeButtons.length); i++) {
        await likeButtons[i].click();
        await page.waitForTimeout(2000); // Delay between actions
    }

    return { likesGiven: Math.min(5, likeButtons.length) };
}
```

## Best Practices

1. **Rate Limiting**: Add delays between actions to avoid detection
2. **Proxy Rotation**: Use different proxies for different accounts
3. **Cookie Management**: Store and reuse cookies for session persistence
4. **Error Handling**: Implement proper error handling and retries
5. **Resource Management**: Always clean up browser instances

## Troubleshooting

### Common Issues

1. **Proxy Connection Failed**
   - Check proxy credentials and format
   - Ensure proxy supports SOCKS5
   - Test proxy connectivity manually

2. **Browser Launch Failed**
   - Install Playwright browsers: `npm run install-browsers`
   - Check system resources (RAM, CPU)

3. **Instagram Blocks**
   - Use different User-Agents
   - Implement random delays
   - Rotate proxies frequently

## Security Notes

- Never commit proxy credentials to version control
- Use environment variables for sensitive data
- Respect website terms of service
- Implement proper rate limiting

## License

MIT License - See LICENSE file for details
