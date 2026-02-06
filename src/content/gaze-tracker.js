// Passive Gaze Tracker - Tracks images viewed for >2 seconds
(function () {
  'use strict';

  const TIME_THRESHOLD = 2000; // 2 seconds
  const SIZE_THRESHOLD = 200; // pixels
  const DEBOUNCE_ITEMS = 3;
  const DEBOUNCE_TIME = 5000; // 5 seconds

  const observedImages = new Map();
  const queuedItems = [];
  let debounceTimer = null;

  // Extract highest resolution image URL
  function extractHighResUrl(img) {
    // Priority 1: data-zoom-image attribute
    if (img.dataset.zoomImage) {
      return img.dataset.zoomImage;
    }

    // Priority 2: srcset (parse for largest)
    if (img.srcset) {
      const sources = img.srcset.split(',').map(s => {
        const parts = s.trim().split(/\s+/);
        return {
          url: parts[0],
          width: parseInt(parts[1]) || 0,
        };
      });
      if (sources.length > 0) {
        const largest = sources.reduce((max, curr) =>
          curr.width > max.width ? curr : max
        );
        return largest.url;
      }
    }

    // Priority 3: src fallback
    return img.src;
  }

  // Extract metadata from page
  function extractMetadata() {
    const meta = {
      title: null,
      price: null,
      brand: null,
    };

    // Title: og:title or h1
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      meta.title = ogTitle.content;
    } else {
      const h1 = document.querySelector('h1');
      if (h1) meta.title = h1.textContent.trim();
    }

    // Price: Look for currency symbols
    const pricePattern = /[\$£€¥]\s*[\d,]+\.?\d*/;
    const bodyText = document.body.textContent;
    const priceMatch = bodyText.match(pricePattern);
    if (priceMatch) {
      meta.price = priceMatch[0];
    }

    // Brand: domain or meta tags
    meta.brand = window.location.hostname;

    // Strict Product Verification (as requested)
    let score = 0;
    const bodyTextLower = bodyText.toLowerCase();

    if (document.querySelector('meta[property="og:type"][content="product"]')) score += 5;
    if (/add to cart|add to bag|buy now/i.test(bodyTextLower)) score += 2;
    if (document.querySelector('select[name*="size" i], .size-selector, #size-selector')) score += 2;
    if (bodyTextLower.includes('size guide') || bodyTextLower.includes('size table')) score += 1;
    if (document.querySelector('.color-picker, [class*="color-swatch"]')) score += 1;
    if (bodyTextLower.includes('material') || bodyTextLower.includes('fabric')) score += 1;

    meta.intentScore = score;

    return meta;
  }

  // Send batch to background script
  // Send batch to background script
  function sendBatch() {
    if (queuedItems.length === 0) return;

    if (!chrome.runtime?.id) {
      // Extension context invalid, stop tracking
      shutdown();
      return;
    }

    const itemsToSend = [...queuedItems];
    queuedItems.length = 0;

    try {
      chrome.runtime.sendMessage({
        type: 'BATCH_ITEMS',
        items: itemsToSend,
      }).catch(err => {
        if (err.message.includes('Extension context invalidated')) {
          shutdown();
        } else {
          console.error('Error sending batch:', err);
        }
      });
    } catch (e) {
      if (e.message.includes('Extension context invalidated')) {
        shutdown();
      }
    }
  }

  function shutdown() {
    observer.disconnect();
    mutationObserver.disconnect();
    console.log('[DejaVista] Extension context invalidated. Stopping tracker.');
  }

  // Debounce logic
  function queueItem(item) {
    queuedItems.push(item);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Send if we hit item threshold
    if (queuedItems.length >= DEBOUNCE_ITEMS) {
      sendBatch();
      return;
    }

    // Otherwise, set timer
    debounceTimer = setTimeout(() => {
      sendBatch();
    }, DEBOUNCE_TIME);
  }

  // Intersection Observer callback
  function handleIntersection(entries) {
    // Only track if tab is active
    if (document.hidden) return;

    entries.forEach(entry => {
      const img = entry.target;
      const imgId = img.src || img.dataset.zoomImage || 'unknown';

      if (entry.isIntersecting) {
        // Start tracking
        if (!observedImages.has(imgId)) {
          const rect = img.getBoundingClientRect();

          // Check size threshold
          if (rect.width < SIZE_THRESHOLD || rect.height < SIZE_THRESHOLD) {
            return;
          }

          observedImages.set(imgId, {
            startTime: Date.now(),
            img: img,
          });
        }
      } else {
        // Check if we've viewed long enough
        const record = observedImages.get(imgId);
        if (record) {
          const viewDuration = Date.now() - record.startTime;

          if (viewDuration >= TIME_THRESHOLD) {
            // Extract data and queue
            const highResUrl = extractHighResUrl(record.img);
            const metadata = extractMetadata();

            queueItem({
              url: highResUrl,
              meta: {
                ...metadata,
                image: highResUrl,
              },
            });

            // Remove from tracking
            observedImages.delete(imgId);
          }
        }
      }
    });
  }

  // Initialize Intersection Observer
  const observer = new IntersectionObserver(handleIntersection, {
    threshold: 0.5, // Image must be 50% visible
  });

  function observeImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      // optimization: skip already tracked or very small images (likely icons/tracking pixels) without layout thrashing
      // We check naturalWidth if available, otherwise just observe and filter later
      if (img.src && !img.dataset.dejavistaTracked) {
        if (img.naturalWidth > 50 && img.naturalHeight > 50) {
          img.dataset.dejavistaTracked = 'true';
          observer.observe(img);
        } else if (!img.complete) {
          // If not loaded, observe anyway and filter in callback
          img.dataset.dejavistaTracked = 'true';
          observer.observe(img);
        }
      }
    });
  }

  // Initial observation
  observeImages();

  // Watch for dynamically added images
  const mutationObserver = new MutationObserver(() => {
    observeImages();
  });

  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Listen for metadata requests from Side Panel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_PRODUCT_METADATA') {
      const metadata = extractMetadata();
      // Find the largest image on screen right now as a best guess for "main image"
      // or just reuse known high-res logic if possible.
      // For now, let's grab the best documented "observed" image that is visible.
      // Or simply find the largest image in the viewport.

      let bestImage = null;
      let maxArea = 0;

      document.querySelectorAll('img').forEach(img => {
        const rect = img.getBoundingClientRect();
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

        // Relaxed visibility: Image must be at least 201x201 and partially in viewport
        const isVisible = rect.width > 200 && rect.height > 200 &&
          rect.bottom > 0 && rect.right > 0 &&
          rect.top < viewportHeight && rect.left < viewportWidth;

        if (isVisible) {
          // Calculate area in viewport (roughly)
          const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
          const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
          const visibleArea = visibleWidth * visibleHeight;

          if (visibleArea > maxArea) {
            maxArea = visibleArea;
            bestImage = img;
          }
        }
      });

      const imageUrl = bestImage ? extractHighResUrl(bestImage) : null;

      sendResponse({
        url: window.location.href,
        meta: {
          ...metadata,
          image: imageUrl
        }
      });
    }
    // Return true not needed unless async, but good practice if we were doing async work
  });

  // Send any remaining items on page unload
  window.addEventListener('beforeunload', () => {
    if (queuedItems.length > 0) {
      sendBatch();
    }
  });
})();
