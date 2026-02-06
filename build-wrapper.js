import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Check if running in Vercel environment
if (process.env.VERCEL) {
    console.log(' [DejaVista] Detected Vercel environment.');
    console.log(' [DejaVista] Skipping Chrome Extension build. Preparing landing page...');

    try {
        // Create dist directory
        const distDir = path.resolve('dist');
        if (!fs.existsSync(distDir)) {
            fs.mkdirSync(distDir);
        }

        // Copy index.html to dist/index.html
        const srcIndex = path.resolve('index.html');
        const destIndex = path.join(distDir, 'index.html');

        if (fs.existsSync(srcIndex)) {
            fs.copyFileSync(srcIndex, destIndex);
            console.log(' [DejaVista] ✓ Landing page ready in dist/index.html');
        } else {
            console.error(' [DejaVista] ✗ index.html not found in root!');
            process.exit(1);
        }

    } catch (error) {
        console.error(' [DejaVista] Error preparing landing page:', error);
        process.exit(1);
    }

    process.exit(0);
}

// Run the normal local build
console.log(' [DejaVista] Starting local Chrome Extension build...');
try {
    // Execute the original build command: vite build && node build-extension.js
    // stdio: 'inherit' ensures we see the output and colors
    execSync('vite build && node build-extension.js', { stdio: 'inherit' });
} catch (error) {
    console.error(' [DejaVista] Build failed.');
    process.exit(1);
}
