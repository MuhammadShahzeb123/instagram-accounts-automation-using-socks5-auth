# Instagram Upload Mode - Simple Usage

## How It Works

Use `npm run upload {n}` where `n` is the account number (1-5).

### Commands

```bash
npm run upload 1  # Uses account #1 (alloyflirtt)
npm run upload 2  # Uses account #2 (flirtsync)
npm run upload 3  # Uses account #3 (silentflirtt)
npm run upload 4  # Uses account #4 (aerorizzz)
npm run upload 5  # Uses account #5 (miragelines)
```

### What Happens

1. **Sets up proxy** for that specific account
2. **Loads cookies** for that account
3. **Opens browser** with everything ready
4. **Keeps open** for exactly 5000 seconds (83+ minutes)
5. **Closes automatically** after 5000 seconds

### Available Accounts

1. **alloyflirtt** → Proxy: 134.195.155.40:9330
2. **flirtsync** → Proxy: 134.195.152.111:9234
3. **silentflirtt** → Proxy: 134.195.155.182:9136
4. **aerorizzz** → Proxy: 38.153.57.54:9458
5. **miragelines** → Proxy: 38.153.31.217:9794

### Example

```bash
npm run upload 2
```

This will:
- Start browser with **flirtsync** account
- Use proxy **134.195.152.111:9234**
- Load **flirtsync's cookies**
- Keep browser open for **5000 seconds**
- You can manually use Instagram during this time

That's it! Simple and clean.
