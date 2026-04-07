# Deployment Configuration - SQLite WASM Notes App

## Required HTTP Headers

The SQLite WASM library requires specific headers for OPFS (Origin Private File System) support:

### Required Headers

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Vite Configuration

Add to your `vite.config.js`:

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
});
```

### Nginx Configuration

```nginx
location / {
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    try_files $uri $uri/ /index.html;
}
```

### Apache Configuration

```apache
<IfModule mod_headers.c>
    Header always set Cross-Origin-Opener-Policy "same-origin"
    Header always set Cross-Origin-Embedder-Policy "require-corp"
</IfModule>
```

### Netlify

Create `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Opener-Policy = "same-origin"
    Cross-Origin-Embedder-Policy = "require-corp"
```

### Vercel

Create `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        }
      ]
    }
  ]
}
```

## Without OPFS Headers

If you cannot set these headers, the app will still work but will use an in-memory database. **Notes will be lost when the tab is closed.**

## Testing Headers

Verify headers are set correctly:

```bash
curl -I https://your-domain.com
```

Look for:
```
cross-origin-opener-policy: same-origin
cross-origin-embedder-policy: require-corp
```

## Security Considerations

- These headers enable cross-origin isolation, which is required for `SharedArrayBuffer` and OPFS
- Your site will not be able to load cross-origin resources (images, scripts) unless they have proper CORS headers
- Test thoroughly after enabling these headers

## Resources

- [sqlite-wasm on GitHub](https://github.com/sqlite/sqlite-wasm)
- [MDN: Origin Private File System](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [MDN: Cross-Origin-Opener-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy)
- [MDN: Cross-Origin-Embedder-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Embedder-Policy)
