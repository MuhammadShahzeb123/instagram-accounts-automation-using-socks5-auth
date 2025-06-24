# Instagram Upload Mode - Usage Examples

## Quick Start

The upload mode allows you to spawn Instagram browsers with your saved cookies and proxies for manual use.

### Commands

```bash
# Use 1 account (first account: alloyflirtt)
npm run upload 1

# Use 2 accounts (alloyflirtt + flirtsync)
npm run upload 2

# Use 3 accounts (alloyflirtt + flirtsync + silentflirtt)
npm run upload 3

# Use all 5 accounts
npm run upload 5
```

### What Happens When You Run Upload Mode

1. **Proxy Setup**: Each browser gets its own SOCKS5 proxy
2. **Cookie Loading**: Saved cookies are automatically loaded
3. **Auto Login**: If cookies are valid, you're logged in automatically
4. **Manual Browsing**: Browsers stay open for you to use manually
5. **Cookie Saving**: Press Ctrl+C to save cookies and close all browsers

### Account Order

The accounts are used in this order:
1. alloyflirtt (proxy: 134.195.155.40:9330)
2. flirtsync (proxy: 134.195.152.111:9234)
3. silentflirtt (proxy: 134.195.155.182:9136)
4. aerorizzz (proxy: 38.153.57.54:9458)
5. miragelines (proxy: 38.153.31.217:9794)

### Tips

- **Each browser has its own proxy** - Perfect for managing multiple accounts
- **Cookies are automatically managed** - No need to login manually if cookies exist
- **Use Ctrl+C to save and exit** - This saves cookies for next time
- **Browsers stay open** - Perfect for uploading content, managing posts, etc.

### Example Workflow

```bash
# Start 3 browsers
npm run upload 3

# Use the browsers manually for:
# - Uploading posts
# - Responding to comments
# - Managing stories
# - Following/unfollowing

# When done, press Ctrl+C to save cookies and close
```

### Troubleshooting

- **Login required**: If cookies expired, login manually in the browser
- **Proxy issues**: Check if your proxy credentials are correct
- **Browser crashes**: Restart with the same command
