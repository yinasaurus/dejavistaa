// Buying Intent Scorer - Detects product pages and triggers Side Panel
(function () {
  'use strict';

  // Low threshold so we show on real product pages, but still require some buying signals
  const INTENT_THRESHOLD = 0;

  function isContextValid() {
    return !!(chrome.runtime && chrome.runtime.id);
  }

  function calculateIntentScore() {
    let score = 0;

    // Check for og:type="product" (+5 points)
    const ogType = document.querySelector('meta[property="og:type"]');
    if (ogType && ogType.content === 'product') {
      score += 5;
    }

    // Check for "Add to Cart" button (+2 points)
    const addToCartTexts = [
      'add to cart',
      'add to bag',
      'add to basket',
      'buy now',
      'purchase',
      'checkout',
      'order now',
    ];
    const bodyText = document.body.textContent.toLowerCase();
    addToCartTexts.forEach((text) => {
      if (bodyText.includes(text)) {
        score += 2;
        return;
      }
    });

    // Check for currency symbols near large text (+1 point)
    // Ignore generic "$1" prices which are common false positives
    const pricePattern = /[\$£€¥]\s*[\d,]+\.?\d*/;
    const bodyTextRaw = document.body.textContent;
    const priceMatch = bodyTextRaw.match(pricePattern);
    if (priceMatch && !priceMatch[0].match(/^[\$£€¥]\s*1$/)) {
      score += 1;
    }

    // Check for size selector (+2 points)
    const sizeSelectors = [
      'select[name*="size" i]',
      'select[name*="Size" i]',
      '[data-testid*="size" i]',
      '[class*="size" i] button',
      '[class*="size" i] li',
      '.size-selector',
      '#size-selector',
      '[aria-label*="size" i]',
    ];
    sizeSelectors.forEach((selector) => {
      if (document.querySelector(selector)) {
        score += 2;
        return;
      }
    });

    // Check for size guide / table (+1 point)
    if (
      bodyText.includes('size guide') ||
      bodyText.includes('size table') ||
      bodyText.includes('size chart') ||
      bodyText.includes('fit guide')
    ) {
      score += 1;
    }

    // Check for color variations (+1 point)
    if (
      document.querySelector(
        '.color-picker, [class*="color-swatch"], [id*="color-swatch"], [class*="variant" i]'
      )
    ) {
      score += 1;
    }

    // Check for materials (+1 point)
    if (
      bodyText.includes('material') ||
      bodyText.includes('fabric') ||
      bodyText.includes('composition') ||
      bodyText.includes('cotton') ||
      bodyText.includes('polyester')
    ) {
      score += 1;
    }

    // Check for stock status (+1 point)
    if (
      bodyText.includes('in stock') ||
      bodyText.includes('low stock') ||
      bodyText.includes('out of stock') ||
      bodyText.includes('available')
    ) {
      score += 1;
    }

    // Check for quantity (+1 point)
    if (
      bodyText.includes('qty') ||
      bodyText.includes('quantity') ||
      document.querySelector('input[name*="qty" i], select[name*="qty" i]')
    ) {
      score += 1;
    }

    return score;
  }

  function extractCurrentProduct() {
    const meta = {
      title: null,
      price: null,
      brand: null,
      image: null,
      description: null,
    };

    // Title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      meta.title = ogTitle.content;
    } else {
      const h1 = document.querySelector('h1');
      if (h1) meta.title = h1.textContent.trim();
    }

    // Normalize base product name, then add dynamic color from the page.
    let baseTitle = meta.title || '';
    if (baseTitle) {
      // Drop site suffix after "|"
      const pipeIdx = baseTitle.indexOf('|');
      baseTitle = pipeIdx !== -1 ? baseTitle.slice(0, pipeIdx).trim() : baseTitle.trim();

      // If there are multiple " - " segments, keep only the first part (product name)
      const dashParts = baseTitle.split(' - ');
      if (dashParts.length > 1) {
        baseTitle = dashParts[0].trim();
      }
    }

    // --- Color detection (site-aware, with generic fallback) ---
    function detectCurrentColor() {
      const host = (window.location.hostname || '').toLowerCase();

      // Helper to read first non-empty textContent from a list of selectors
      const readFromSelectors = (selectors) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.textContent) {
            const txt = el.textContent.trim();
            if (txt) return txt;
          }
        }
        return null;
      };

      // H&M
      if (host.includes('hm.com')) {
        const hmColor =
          readFromSelectors(['[data-testid*="color" i]', '[data-test*="color" i]']) || null;
        if (hmColor) return hmColor;
      }

      // Uniqlo
      if (host.includes('uniqlo.com')) {
        const uniqloColor = readFromSelectors([
          '[data-test="color-name"]',
          '[class*="color-name" i]',
          '[class*="current-color" i]',
        ]);
        if (uniqloColor) return uniqloColor;
      }

      // Zara
      if (host.includes('zara.com')) {
        const zaraColor = readFromSelectors([
          '.product-detail-color-name',
          '[data-qa*="color-name" i]',
        ]);
        if (zaraColor) return zaraColor;
      }

      // ASOS
      if (host.includes('asos.com')) {
        const asosColor = readFromSelectors([
          '[data-test-id="colour-selection"]',
          '[class*="colour" i] span',
        ]);
        if (asosColor) return asosColor;
      }

      // Generic fallback: "COLOR: <name>" / "COLOUR: <name>" anywhere in the body
      const allEls = Array.from(document.querySelectorAll('body *'));
      const colorContainer = allEls.find((el) =>
        /COLOU?R\s*:/i.test(el.textContent || '')
      );
      if (colorContainer) {
        const match = colorContainer.textContent.match(/COLOU?R\s*:\s*(.+)$/i);
        if (match && match[1]) {
          return match[1].trim();
        }
      }

      return null;
    }

    const currentColor = detectCurrentColor();

    meta.color = currentColor || null;
    meta.title = baseTitle
      ? currentColor
        ? `${baseTitle} - ${currentColor}`
        : baseTitle
      : currentColor || baseTitle;

    // Price
    const pricePattern = /[\$£€¥]\s*[\d,]+\.?\d*/g; // Global search
    const bodyTextRaw = document.body.textContent;
    const matches = bodyTextRaw.match(pricePattern);

    if (matches && matches.length) {
      // Parse all price-like tokens and choose the highest numeric value.
      // This avoids picking small coupon amounts like "$7 off" when the
      // actual product price is much higher (common on Uniqlo and others).
      const numericValues = matches
        .map((p) => {
          const num = parseFloat(p.replace(/[^\d.]/g, ''));
          return Number.isNaN(num) ? null : num;
        })
        .filter((n) => n !== null);

      if (numericValues.length) {
        const maxValue = Math.max(...numericValues);
        const idx = numericValues.indexOf(maxValue);
        const chosen = matches[idx] || matches[0];
        meta.price = chosen;
      }
    }

    // Brand
    meta.brand = window.location.hostname;

    // Image
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      meta.image = ogImage.content;
    } else {
      // Try a few common product image patterns (covers H&M, Uniqlo, etc.)
      let mainImg =
        document.querySelector('img[src*="product"], img[data-zoom-image]') ||
        document.querySelector('[data-testid*="product-image" i]') ||
        document.querySelector('img[class*="product-detail"], img[class*="product-detail-main"]') ||
        document.querySelector('main img');

      if (!mainImg) {
        // Last-resort fallback: first reasonably-sized image on the page
        const allImgs = Array.from(document.querySelectorAll('img'));
        mainImg =
          allImgs.find((img) => img.naturalWidth >= 200 && img.naturalHeight >= 200) || allImgs[0];
      }

      if (mainImg) {
        meta.image =
          mainImg.dataset.zoomImage ||
          (mainImg.srcset ? mainImg.srcset.split(',')[0].trim().split(' ')[0] : null) ||
          mainImg.currentSrc ||
          mainImg.src;
      }
    }

    if (!meta.image) {
      const mainImg = document.querySelector(
        'img[src*="product"], img[data-zoom-image], [class*="product-image"] img, [id*="product-image"] img, .main-image img, #main-image img'
      );
      if (mainImg) {
        meta.image =
          mainImg.dataset.zoomImage ||
          mainImg.dataset.mainImage ||
          (mainImg.srcset ? mainImg.srcset.split(',')[0].trim() : null) ||
          mainImg.src;
      }
    }

    // Category/Description (Improved Detection)
    const descriptionSelectors = [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[property="product:brand"]',
      'meta[name="keywords"]',
    ];
    for (const selector of descriptionSelectors) {
      const el = document.querySelector(selector);
      if (el && el.content) {
        meta.description = (meta.description || '') + ' ' + el.content;
      }
    }
    meta.description = meta.description?.trim();

    // Verification Score
    meta.intentScore = calculateIntentScore();

    return meta;
  }

  // Create and inject Floating Action Button
  function showNotification(product) {
    if (!isContextValid()) return;

    // Check if already exists
    if (document.getElementById('dejavista-fab')) return;

    const fab = document.createElement('div');
    fab.id = 'dejavista-fab';

    try {
      fab.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="${chrome.runtime.getURL('icons/icon48.png')}" style="width: 24px; height: 24px;">
          <span>View Match</span>
        </div>
      `;
    } catch (e) {
      return; // Context invalidated
    }

    // Styles
    Object.assign(fab.style, {
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: '2147483647', // Max z-index
      backgroundColor: '#773344', // Brand color
      color: 'white',
      padding: '12px 20px',
      borderRadius: '50px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      cursor: 'pointer',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
      transform: 'translateY(100px)', // Start hidden
      display: 'flex',
      alignItems: 'center',
    });

    // Use addEventListener so click works even if onclick is cleared/hidden
    fab.addEventListener('click', () => {
      if (!isContextValid()) {
        fab.remove();
        return;
      }

      console.log('[DejaVista] FAB clicked, sending OPEN_SIDE_PANEL message');
      try {
        chrome.runtime.sendMessage({
          type: 'OPEN_SIDE_PANEL',
          product: product,
        });
      } catch (err) {
        console.error('[DejaVista] ✗ Failed to send OPEN_SIDE_PANEL message', err);
      }
      fab.style.transform = 'translateY(100px)'; // Hide after click
    });

    document.body.appendChild(fab);

    // Animate in
    setTimeout(() => {
      if (fab.parentNode) {
        fab.style.transform = 'translateY(0)';
      }
    }, 100);
  }

  // Improved SPA Support & Execution Logic
  function runScorer() {
    if (!isContextValid()) return;

    // Debounce to avoid running multiple times during rapid DOM changes
    if (window.dejavistaScorerTimeout) clearTimeout(window.dejavistaScorerTimeout);

    window.dejavistaScorerTimeout = setTimeout(() => {
      try {
        // Remove existing FAB to prevent duplicates on navigation
        const existingFab = document.getElementById('dejavista-fab');
        if (existingFab) existingFab.remove();

        const score = calculateIntentScore();
        if (score > INTENT_THRESHOLD) {
          const currentProduct = extractCurrentProduct();
          showNotification(currentProduct);
        }
      } catch (e) {
        if (e.message && e.message.includes('Extension context invalidated')) {
          console.log('[DejaVista] Context invalidated, stopping scorer.');
        } else {
          console.error('[DejaVista] Scorer error:', e);
        }
      }
    }, 1000);
  }

  // 1. Run on initial load
  runScorer();

  // 2. Watch for URL changes (SPA Navigation)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log('[DejaVista] URL changed, re-running scorer...');
      runScorer();
    }
  }).observe(document, { subtree: true, childList: true });
})();

