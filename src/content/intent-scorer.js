// Buying Intent Scorer - Detects product pages and triggers Side Panel
(function () {
  'use strict';

  const INTENT_THRESHOLD = 3; // Reverted back to 3 to avoid homepages

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
      'order now'
    ];
    const bodyText = document.body.textContent.toLowerCase();
    addToCartTexts.forEach(text => {
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
      '[aria-label*="size" i]'
    ];
    sizeSelectors.forEach(selector => {
      if (document.querySelector(selector)) {
        score += 2;
        return;
      }
    });

    // Check for size guide / table (+1 point)
    if (bodyText.includes('size guide') || bodyText.includes('size table') || bodyText.includes('size chart') || bodyText.includes('fit guide')) {
      score += 1;
    }

    // Check for color variations (+1 point)
    if (document.querySelector('.color-picker, [class*="color-swatch"], [id*="color-swatch"], [class*="variant" i]')) {
      score += 1;
    }

    // Check for materials (+1 point)
    if (bodyText.includes('material') || bodyText.includes('fabric') || bodyText.includes('composition') || bodyText.includes('cotton') || bodyText.includes('polyester')) {
      score += 1;
    }

    // Check for stock status (+1 point)
    if (bodyText.includes('in stock') || bodyText.includes('low stock') || bodyText.includes('out of stock') || bodyText.includes('available')) {
      score += 1;
    }

    // Check for quantity (+1 point)
    if (bodyText.includes('qty') || bodyText.includes('quantity') || document.querySelector('input[name*="qty" i], select[name*="qty" i]')) {
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

    // Price
    const pricePattern = /[\$£€¥]\s*[\d,]+\.?\d*/g; // Global search
    const bodyTextRaw = document.body.textContent;
    const matches = bodyTextRaw.match(pricePattern);

    if (matches) {
      // Find the first price that isn't "$1" or similar junk
      const realPrice = matches.find(p => !p.match(/^[\$£€¥]\s*1$/));
      if (realPrice) {
        meta.price = realPrice;
      }
    }

    // Brand
    meta.brand = window.location.hostname;

    // Image
    const imageSelectors = [
      'meta[property="og:image"]',
      'meta[name="twitter:image"]',
      'link[rel="image_src"]',
      'meta[property="og:image:secure_url"]'
    ];

    for (const selector of imageSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        meta.image = el.content || el.href;
        if (meta.image) break;
      }
    }

    if (!meta.image) {
      const mainImg = document.querySelector('img[src*="product"], img[data-zoom-image], [class*="product-image"] img, [id*="product-image"] img, .main-image img, #main-image img');
      if (mainImg) {
        meta.image = mainImg.dataset.zoomImage || mainImg.dataset.mainImage || mainImg.srcset?.split(',')[0]?.trim() || mainImg.src;
      }
    }

    // Category/Description (Improved Detection)
    const descriptionSelectors = [
      'meta[property="og:description"]',
      'meta[name="description"]',
      'meta[property="product:brand"]',
      'meta[name="keywords"]'
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

    fab.onclick = () => {
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
        fab.style.transform = 'translateY(100px)'; // Hide after click
      } catch (e) {
        console.log('[DejaVista] Failed to send message (context invalidated)');
        fab.remove();
      }
    };

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
