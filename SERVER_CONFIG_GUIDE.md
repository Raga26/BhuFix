# Server Configuration Guide - BhuFix Pre-rendered Site

## Overview
Your site now generates pre-rendered HTML files. These instructions ensure your server serves them correctly to search engines and users.

## For Vercel/Netlify Deployment

### Vercel (.vercel/config.json or vercel.json)
```json
{
  "buildCommand": "cd frontend && npm run build",
  "outputDirectory": "frontend/build",
  "framework": "react"
}
```

**Automatic**: Vercel automatically serves pre-rendered files from the build directory.

### Netlify (netlify.toml)
```toml
[build]
  command = "cd frontend && npm run build"
  publish = "frontend/build"
```

**Automatic**: Netlify automatically handles static file serving.

## For Traditional Servers (Apache, Nginx)

### Apache (.htaccess in build directory)

```apache
# Enable gzip compression
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Set cache headers for static assets
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ico)$">
  Header set Cache-Control "public, max-age=31536000"
</FilesMatch>

# Client-side routing fallback
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # Skip pre-rendered files
  RewriteCond %{REQUEST_FILENAME} -f
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # For SPA - serve index.html for non-existent routes
  # But since we pre-render, this only serves if a route isn't pre-rendered
  RewriteRule ^ index.html [QSA,L]
</IfModule>

# Set proper MIME types
<IfModule mod_mime.c>
  AddType application/json .json
  AddType image/svg+xml .svg
</IfModule>

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options: "nosniff"
  Header set X-Frame-Options: "SAMEORIGIN"
  Header set Referrer-Policy: "strict-origin-when-cross-origin"
</IfModule>
```

### Nginx (nginx.conf)

```nginx
server {
    listen 80;
    server_name bhufix.com www.bhufix.com;

    root /var/www/html/frontend/build;

    # Enable gzip compression
    gzip on;
    gzip_types text/html text/plain text/xml text/css text/javascript application/javascript application/json;
    gzip_min_length 1000;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header Referrer-Policy strict-origin-when-cross-origin;

    # Serve pre-rendered index.html for root
    location = / {
        try_files $uri /index.html;
    }

    # SPA routing fallback (if any routes aren't pre-rendered)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Key Points

1. **Pre-rendered files are served directly** - No server-side rendering needed
2. **Gzip compression improves delivery** - Significantly reduces file size
3. **Cache headers improve performance** - Browser caches static assets for 1 year
4. **Fallback routing still works** - For any non-pre-rendered routes (currently none)

## Testing Your Deployment

### Check if pre-rendering worked
```bash
# Look for static HTML files (not just React bundle)
ls -la build/
# Should show: index.html, static/, favicon.ico, robots.txt, sitemap.xml
```

### Verify HTML is pre-rendered (not just a shell)
```bash
# Check file size - should be large (containing full content)
wc -c build/index.html

# Check content - should contain actual text (not just <div id="root">)
grep -o "Bhufix" build/index.html
```

### Test with curl
```bash
curl -I https://bhufix.com
# Should see: Content-Type: text/html, Content-Encoding: gzip

curl https://bhufix.com | head -100
# Should show full HTML with your content, not just root div
```

## Troubleshooting

### Issue: Still seeing empty page/no snippet
1. Verify `npm run build` completed without errors
2. Check `build/index.html` file size (should be >50KB)
3. Clear CloudFlare/CDN cache if using one
4. Wait 24-48 hours for Google to recrawl

### Issue: Builds are too slow
1. Check `snap.json` timeout value
2. Increase if needed: `"timeout": 180000`
3. Check for console errors slowing down rendering

### Issue: Assets not loading correctly
1. Verify `public/` folder structure
2. Check `craco.config.js` for correct PUBLIC_URL
3. Ensure server serves static files from correct path

## Performance Monitoring

After deployment:
1. Go to Google Search Console → Core Web Vitals
2. Monitor:
   - **LCP** (Largest Contentful Paint) - should be < 2.5s
   - **FID** (First Input Delay) - should be < 100ms
   - **CLS** (Cumulative Layout Shift) - should be < 0.1
3. Use Lighthouse: https://developers.google.com/web/tools/lighthouse

## Deployment Checklist

- [ ] Run `npm run build` successfully
- [ ] Verify `build/index.html` has full content
- [ ] Deploy `frontend/build/` to production
- [ ] Test homepage loads with pre-rendered HTML
- [ ] Verify `robots.txt` is served correctly
- [ ] Verify `sitemap.xml` is accessible
- [ ] Submit sitemap to Google Search Console
- [ ] Request indexing in GSC
- [ ] Check Core Web Vitals
- [ ] Monitor Search Console for errors

---

**Last Updated**: 2026-03-30
