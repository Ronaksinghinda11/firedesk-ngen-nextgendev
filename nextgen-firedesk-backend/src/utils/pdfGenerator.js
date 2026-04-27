const puppeteer = require('puppeteer');

/**
 * Convert HTML to PDF buffer using Puppeteer
 *
 * @param {string} html - HTML content to convert
 * @param {Object} options - PDF options (format, landscape, etc.)
 * @returns {Promise<Buffer>} - PDF buffer
 */
let browserInstance = null;

async function getBrowser() {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }

    console.log('Launching new Puppeteer browser instance...');
    browserInstance = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    });
    return browserInstance;
}

/**
 * Convert HTML to PDF buffer using Puppeteer
 *
 * @param {string} html - HTML content to convert
 * @param {Object} options - PDF options (format, landscape, etc.)
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function htmlToPdfBuffer(html, options = { format: 'A4' }) {
    let page = null;
    try {
        console.log('PDFUTILS: Starting generation with 50s timeout...');
        const browser = await getBrowser();
        page = await browser.newPage();

        // Set reasonable timeouts to prevent hung processes
        await page.setDefaultNavigationTimeout(50000);
        await page.setDefaultTimeout(50000);

        // Optimize page loading
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font'].includes(resourceType)) {
                req.continue();
            } else if (['document', 'script'].includes(resourceType)) {
                req.continue();
            } else {
                req.abort(); // Block unnecessary resources like media, websocket, etc.
            }
        });

        console.log('Setting page content (Timeout: 50s)...');
        await page.setContent(html, {
            waitUntil: 'load',
            timeout: 50000
        });

        console.log('Generating PDF...');
        const pdfBuffer = await page.pdf({
            format: options.format || 'A4',
            landscape: options.landscape || false,
            printBackground: options.printBackground !== false,
            margin: options.margin || {
                top: '10mm',
                right: '5mm',
                bottom: '10mm',
                left: '5mm'
            }
        });

        console.log('PDF generated, size:', pdfBuffer.length, 'bytes');

        if (!pdfBuffer || pdfBuffer.length === 0) {
            throw new Error('PDF buffer is empty');
        }

        // Puppeteer versions >= v21 return Uint8Array.
        // Express res.send() stringifies Uint8Array into JSON (11MB size) unless explicitly converted to a Node Buffer.
        return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    } catch (error) {
        console.error('PDF generation error:', error);
        // If browser crashed, reset instance
        if (browserInstance && !browserInstance.isConnected()) {
            browserInstance = null;
        }
        throw error;
    } finally {
        if (page) {
            await page.close();
        }
    }
}

module.exports = {
    htmlToPdfBuffer
};
