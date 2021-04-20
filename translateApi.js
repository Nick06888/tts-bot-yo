const puppeteer = require('puppeteer');
const queue = require('./queue');

const trsQueue = new queue.Queue();
let trsQueueRunning = false;

/**
 * 
 * @param {String}
 * @param {String}
 * @param {String}
 */
function getTextResult(langFrom, langTo, text) {
    return new Promise((resolve) => {
        if (!trsQueueRunning) {
            _loadTrs();
        }
        const url = `https://translate.google.com/#${langFrom}/${langTo}/${encodeURIComponent(text)}`;
        trsQueue.push({
            url,
            callback: (result) => resolve(result)
            
        });
    });
}
/**
 * 
 */
async function _loadTrs() {
    trsQueueRunning = true;
    let browser = null;
    while (trsQueueRunning) {
        if (trsQueue.length === 0) {
            await browser.close();
            browser = null;
        }
        const item = await trsQueue.getNext();
        if (browser == null) {
            browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
        }
        const page = await browser.newPage();
        await page.goto(item.url);
        const translationSelector = '.translation span';
        try {
            await page.waitForSelector(translationSelector);
        } catch (error) {
            console.log(error);
            item.callback(undefined);
            continue;
        }

        const result = await page.evaluate((selector) => {
            return document.querySelector(selector).innerText;
        }, translationSelector);
        item.callback(result);
        await page.close();
    }
}

module.exports = {
    getTextResult,
}