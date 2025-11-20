const fs = require('fs');
const path = require('path');

// Read the built HTML
const htmlPath = path.join(__dirname, 'dist', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf-8');

// Find the script tag
const scriptMatch = html.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/);
if (!scriptMatch) {
    console.error('No script tag found');
    process.exit(1);
}

const scriptSrc = scriptMatch[1];
const scriptPath = path.join(__dirname, 'dist', scriptSrc);

// Read the JavaScript file
let jsContent = fs.readFileSync(scriptPath, 'utf-8');

// Escape </script> tags in JS content to prevent premature closing
jsContent = jsContent.replace(/<\/script>/g, '<\\/script>');

// Replace the script tag with inline script
html = html.replace(
    scriptMatch[0],
    () => `<script type="module">${jsContent}</script>`
);

// Remove modulepreload links as they trigger CORS errors on file://
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');

// Write the inlined HTML
fs.writeFileSync(htmlPath, html);

console.log('Successfully inlined JavaScript into HTML');
