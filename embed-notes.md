# CosmoDrift — Embedding Guide for WordPress FSE

## Overview

CosmoDrift is a self-contained single HTML file (`cosmodrift.html`, ~57 KB) with all CSS and JS inline. No build step, no external dependencies except the Google Fonts @import for the Orbitron font.

**v2.0 — Runner Concept**: Drift mode redesigned as an endless space runner. Ship rests near the bottom, dodges varied obstacle types (asteroids, meteors, cruisers, satellites, wormholes). New pixel-art ship (20×12 grid), rich background with shooting stars, star clusters, and planetary rings.

## Live URLs

- **Cloudflare Tunnel**: https://wonderful-evident-rep-diabetes.trycloudflare.com/cosmodrift.html
- **Netlify Drop**: https://resplendent-semolina-b0b8a5.netlify.app/cosmodrift.html (password: My-Drop-Site)

## iframe Approach (Recommended)

The simplest and most reliable method:

```html
<iframe 
  src="/wp-content/uploads/cosmodrift.html" 
  width="480" 
  height="640" 
  frameborder="0"
  style="display:block; margin:0 auto; max-width:100%; border:none;"
  loading="lazy"
  title="CosmoDrift Game">
</iframe>
```

### Placement Options

**1. Custom HTML Block (FSE-compatible)**
- Add a "Custom HTML" block in the block editor
- Paste the iframe code above
- Works in all FSE themes (Twenty Twenty-Four, etc.)

**2. Shortcode**
Add to `functions.php` of your child theme:

```php
function cosmodrift_embed() {
    return '<div style="text-align:center; margin:20px auto;">
        <iframe src="/wp-content/uploads/cosmodrift.html" 
                width="480" height="640" frameborder="0" 
                style="max-width:100%; border:none;"
                loading="lazy" title="CosmoDrift Game">
        </iframe>
    </div>';
}
add_shortcode('cosmodrift', 'cosmodrift_embed');
```

Then use `[cosmodrift]` in any page/post.

**3. Template Part (FSE)**
- Create a template part in your theme: `content-game.php`
- Include the iframe HTML directly
- Reference from `theme.json` or template hierarchy

## CSP (Content Security Policy) Headers

If your site uses a CSP header, you may need to add:

```
Content-Security-Policy: 
    font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com;
    frame-src 'self' data: blob:;
```

Key concerns:
- **`font-src`**: The Orbitron font loads from `fonts.googleapis.com` and `fonts.gstatic.com`
- **`frame-src`**: If embedding from another domain, allow that origin
- **`script-src`**: No issue — all JS is inline in the HTML file itself
- **`style-src`**: No issue — all CSS is inline in the HTML file itself

### WordPress-specific CSP plugins
- **WP Cerber Security**: If using a plugin-based CSP, add the font and frame sources
- **Cloudflare WAF**: If using Cloudflare's CSP rules, whitelist Google Fonts domains
- **Headers Control plugin**: Add custom CSP headers via the plugin interface

## Responsive Behavior

The game canvas scales to fit its container while maintaining 480×640 aspect ratio:
- On desktop: fixed 480×640 (or container width)
- On mobile: scales down to fit screen width
- Touch events are fully mapped (tap = thrust/fire, swipe = move in combat)

## File Placement

Recommended locations:
- `/wp-content/uploads/cosmodrift.html` — public-facing, no theme dependency
- `/wp-content/themes/your-theme/assets/cosmodrift.html` — theme-bundled
- Direct URL embed: `https://yoursite.com/cosmodrift.html` (serve from root)

## Performance Notes

- File size: ~57 KB (single HTTP request)
- No external JS libraries — minimal parse/compile overhead
- Google Fonts: cached after first load, ~5 KB
- Canvas rendering: uses `requestAnimationFrame` with delta-time
- Audio: Web Audio API, lazy-initialized on first user interaction
- Memory: ~2-5 MB runtime (stars, particles, game objects)
- 19 `imageSmoothingEnabled` calls for crisp pixel-art rendering

## Accessibility

- The `<canvas>` element has no ARIA label by default — add `role="img"` and `aria-label="CosmoDrift browser game"` if needed
- Keyboard controls: Space (thrust/fire), Arrow keys / A-D (move)
- Touch controls: tap and swipe for mobile
- Consider adding a `<noscript>` fallback message

## WordPress FSE Theme-Specific Tips

1. **Block Theme (Twenty Twenty-Four)**: Use the Custom HTML block — it's fully supported
2. **Template Overrides**: You can create a `single-game.html` template part for a dedicated game post type
3. **theme.json**: Add custom spacing if needed:
   ```json
   {
     "custom": {
       "gameContainer": {
         "spacing": { "padding": "20px" }
       }
     }
   }
   ```
4. **Block Bindings**: Use server-side rendering for the iframe if you need dynamic src URLs
