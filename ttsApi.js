const request = require('request');
const puppeteer = require('puppeteer');
const queue = require('./queue');

const trsQueue = new queue.Queue();
let trsQueueRunning = false;

/**
 * 
 * @param {String}
 * @param {String}
 */
function getTTSUrl(text, language) {
    return new Promise((resolve, reject) => {
        request.post(
            {
                url: 'https://ttsmp3.com/makemp3.php',
                form: {
                    msg: text,
                    lang: language,
                    source: 'ttsmp3',
                }
            }, function (err, httpResponse) {
                if (err) {
                    reject(err);
                }
                let url = `https://ttsmp3.com/dlmp3.php?mp3=${JSON.parse(httpResponse.body).MP3}`;
                resolve(url);
            }
        );
    });
}

/**
 * 
 * @param {String}
 * @param {String}
 * @param {String}
 */
function getTRSUrl(langFrom, langTo, text) {
    return new Promise((resolve) => {
        if (!trsQueueRunning) {
            _loadTrs();
        }
        const url = `https://translate.google.com/#${langFrom}/${langTo}/${encodeURIComponent(text)}`;
        trsQueue.push({
            url,
            callback: (result) => resolve(result)
        });
    })
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
        page.setRequestInterception(true);
        page.on('request', (req) => {
            let url = req.url();
            if (url.indexOf('translate_tts?') > -1) {
                item.callback(url);
                req.abort('aborted');
                page.close();
            }
            else req.continue();

        });

        await page.goto(item.url);
        const ttsSelector = '.res-tts';
        try {
            await page.waitForSelector(ttsSelector);
        } catch (error) {
            console.log(error);
            item.callback(undefined);
            continue;
        }

        await page.click(ttsSelector);
    }
}

module.exports = {
    getTTSUrl,
    getTRSUrl,
}