require('dotenv').config();

const fetch = require('node-fetch');
const puppeteer = require("puppeteer");
const { v1: uuid } = require('uuid');
const admin = require('firebase-admin');

/*
 * CONFIG
 */
const BUCKET_NAME = "sefaria-space-media";


const SIZE_OPTIONS = [
    [1024,768]
];

const LANGS = ["en", "he", "mix"];


/*
 * Globals
 */
admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket(BUCKET_NAME);


/*
 * Cloud Function
 */
exports.getScreenshot = wrapCors((req, response) => {
    const respondError = _respondError(response);

    validateQuery(req.query)
        .then(opts => {
            if(opts.mode === "buffer") {
                return getScreenshotBuffer(opts, req, response);
            } else if(opts.mode === "file") {
                return getScreenshotFile(opts, req, response);
            }
        })
        .catch(err => {
            respondError(err);
        });
        
});

/*
 * Handlers
 */
function getScreenshotBuffer(opts, req, response) { 
    const respondJpg = _respondBuffer (response) ("image/jpeg");
    return generateScreenshot(opts)
        .then(buffer => {
            respondJpg(buffer);
        });
}

function getScreenshotFile(opts, req, response) {
    const respondJson = _respondJson (response);

    const {ref, lang, size} = opts;
    const id = `${ref}-${lang}-${size}`;

    return getFilename({ id, overwrite: req.query.overwrite === "true", })
        .then(({filename, isNew}) => 
            isNew
            ? generateScreenshot(opts)
                .then(buffer => writeJpegToFile(imageFile(filename)) (buffer))
                .then(() => ({filename, isNew}))
            : {filename, isNew}
        )
        .then(response => {
            respondJson(response);
        })
        .catch(err => {
            respondError(err);
        });
}

/*
 * Main screenshot pipeline
 */
function generateScreenshot(opts) {
    return fetchData(opts)
        .then(makeContents(opts))
        .then(makeHtml)
        .then(html => Object.assign({}, opts, {html}))
        .then(captureBrowser);
}

/*
 * Data processing 
 */

function validateQuery(query) {
    return new Promise((resolve, reject) => {
        if(!query.hasOwnProperty("size")) {
            return reject("missing query args: size");
        }
        if(!query.hasOwnProperty("ref")) {
            return reject("missing query args: ref");
        }

        if(query.mode !== "buffer" && query.mode !== "file") {
            return reject("mode must be buffer or file");
        }
      
        const {ref, lang, mode} = query;

        const size = parseInt(query.size);
         
        if(LANGS.indexOf(lang) == -1) {
            return reject(`invalid language. must be one of: ${JSON.stringify(LANGS)}`); 
        }
        if(isNaN(size) || size < 0 || size > SIZE_OPTIONS.length-1) {
            return reject("bad size"); 
        }

        resolve({ref, lang, size, mode})
    });
}

function fetchData({ref}) {
    const url = `https://www.sefaria.org/api/texts/${ref}`;
    return fetch(url)
        .then(data => data.json())
        .then(json => {
            return (json.text == null || typeof json.text.length != "number" || json.text.length === 0)
                ? Promise.reject("no json.text.length")
                : json;
        });
}

/*
 * Pupeteer
 */
async function captureBrowser({size, html}) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
        defaultViewport: {
            width: SIZE_OPTIONS[size][0],
            height: SIZE_OPTIONS[size][1], 
        }
    });
    const page = await browser.newPage();
    //all these waits are overkill - but seem to be necessary for font funkiness. remove at your own risk!
    await page.setContent(html, { waitUntil: "networkidle0" });
    //removing this seems to be okay: await page.waitFor(5000);
    await page.evaluateHandle('document.fonts.ready');
    const imageBuffer = await page.screenshot({
        type: "jpeg",
        quality: 90
    });
    await browser.close();

    return imageBuffer;
}

/*
 * Cloud Storage
 */
function setMetadata(meta) {
    return file => 
        new Promise((resolve, reject) => 
            file.setMetadata(meta, null, err => {
                if(err) {
                    reject(err);
                } else {
                    resolve(file);
                }
            })
        );
}


function writeToFileWithMeta(meta) {
    return file => data => 
        new Promise((resolve, reject) => 
                file.save(data, {resumable: false}, err => {
                    if(err) {
                        reject(err);
                    } else {
                        resolve(null);
                    }
                })
        )
        .then(() => setMetadata(meta) (file));
}


function imageFile(filename) {
    return bucket.file(`image-cache/${filename}`);
}

function writeJpegToFile(file) {
    return data =>
        writeToFileWithMeta ({contentType: "image/jpeg"}) (file) (data);
}


async function getFilename({id, overwrite}) {
    const docRef = db.collection('image-cache').doc(id);

    const doc = await docRef.get();

    if(!doc.exists || overwrite === true) {
        const filename = uuid() + '.jpg';

        await docRef.set({filename});

        return ({filename, isNew: true});
    } else {
        return ({filename: doc.get("filename"), isNew: false});
    }
}

/*
 * Http utils
 */
function wrapCors(fn) {
    return (req, res) => {
      // Set CORS headers for preflight requests
      // Allows GETs from any origin with the Content-Type header
      // and caches preflight response for 3600s

      res.set('Access-Control-Allow-Origin', '*');

      if (req.method === 'OPTIONS') {
        // Send response to OPTIONS requests
        res.set('Access-Control-Allow-Methods', 'GET');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Access-Control-Max-Age', '3600');
        res.status(204).send('');
      } else {
        return fn(req, res);
      }
    };
}

function _respondError(res) {
    return error => { 
        console.error(error);
        res.status(400);
        res.send(error); 
        res.end();
    }
}

function _respondJson(res) {
    return data => { 
        res.json(data);
    }
}

function _respondBuffer(res) {
    return contentType => data => { 
        res.contentType(contentType);
        res.status(200);
        res.send(data);
        res.end();
    }
}

function _respondBufferSave(res) {
    return contentType => data => filename => { 
        res.contentType(contentType);
        //res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.status(200);
        res.send(data);
        res.end();
    }
}

/*
 * Contents
 */
function makeContents(settings) {
    return data => 
        new Promise((resolve, reject) => {
            if(!data.he || !data.text) {
                return reject("missing data!");
            }

            const en = data.text;
            const he = data.he;

            const isEnglish = settings.lang === "en" || settings.lang === "mix";
            const isHebrew = settings.lang === "he" || settings.lang === "mix";

            if(isEnglish && !en.length) {
                return reject("no english text");
            }
            if(isHebrew && !he.length) {
                return reject("no hebrew text");
            }
            let str = '';

            if(isHebrew) {
                str += `<h1 class="hetitle">${data.heRef}</h1>`;
            }
            if(isEnglish) {
                str += `<h1 class="entitle">${data.ref}</h1>`;
            }
            let en_idx = 0;
            let he_idx = 0;

            while(en_idx < en.length && he_idx < he.length) {
                str += `<div class="row">`;
                if(isHebrew && he_idx < he.length) {
                    str += `<p class="he">${he[he_idx++]}</p>`;
                }
                if(isEnglish && en_idx < en.length) {
                    str += `<p class="en">${en[en_idx++]}</p>`;
                }
                str += `</div>`;
            }

            resolve(str);
        });
}

function makeHtml(contents) {
    return `
    <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta name="format-detection" content="telephone=no">
                <meta name="msapplication-tap-highlight" content="no">
                <meta name="viewport" content="user-scalable=no, initial-scale=1, maximum-scale=1, minimum-scale=1, width=device-width">
                <style>
                    @font-face {
                        font-family: 'TaameyFrankCLM';
                        src: url('https://www.sefaria.org/static/fonts/Taamey-Frank/TaameyFrankCLM-Medium.ttf') format('truetype');
                    }
                    html {
                        margin: 0; 
                        padding: 0;
                        width: 100%;
                        height: 100%;
                    }
                    body {
                        background: transparent; 
                        margin: 0; 
                        padding: 0;
                        width: 100%;
                        height: 100%;
                    }
                    h1 {
                        text-align: center;
                    }

                    * {
                        box-sizing: border-box;
                        padding: 0px;
                        margin: 0px;
                    }
                    .he, .hetitle {
                        font-family: "TaameyFrankCLM";
                    }
                    .he {
                        text-align: right;
                        dir: rtl;
                        font-size: 32px;
                        margin-bottom: 5px;
                    }
                    .en, .entitle {
                        font-family: _sans;
                    }
                    .en {
                        text-align: left;
                        dir: ltr;
                        font-size: 22px;
                    }
                    .row {
                        padding: 20px 10px 30px 10px;
                        border-bottom: 1px solid #2a2a2a;
                    }
                </style>
            </head>
                <body>
                    ${contents}
                </body>
            </html>
        `;
}
