require('dotenv').config();

const needle = require('needle');
const admin = require('firebase-admin');
const crypto = require('crypto');

/*
 * CONFIG
 */
const BUCKET_NAME = "sefaria-space-media";


/*
 * Globals
 */
admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket(BUCKET_NAME);


/*
 * Cloud Function
 */
exports.getImageCache= wrapCors((req, response) => {
    const respondError = _respondError(response);
    const respondJson = _respondJson(response);
   
    if(!req.query || !req.query.src) {
        respondError("supply src in query!");
        return;
    }

    const {src} = req.query; 

    let overwrite = req.query.overwrite === "true";

    return getFileInfo(src)
        .then(({ext, contentType}) => {
            return getFilename({ src, ext, contentType, overwrite})
                .then(({filename, isNew}) => 
                    isNew
                    ?  copyImage({from: src, to: filename, contentType})
                        //.then(buffer => writeJpegToFile(imageFile(filename)) (buffer))
                        .then(() => ({filename, isNew}))
                    : {filename, isNew}
                )
        })
        .then(response => {
            respondJson(response);
        })
        .catch(err => {
            respondError(err);
        });

     
});

function getFileInfo(filename) {
    return new Promise((resolve, reject) => {
        const idx = filename.lastIndexOf(".");
        if(idx === -1) {
            return reject("no extension to get metadata from");
        }

        return resolve(filename.substr(idx+1).toLowerCase());
    })
    .then(ext => 
        new Promise((resolve, reject) => { 
            switch(ext) {
                case "jpg":
                case "jpeg":
                    return resolve("image/jpeg");
                case "png":
                    return resolve("image/png");
                case "gif":
                    return resolve("image/gif");
                case "tif":
                case "tiff":
                    return resolve("image/tiff");
                default:
                    return reject(`unknown extension: ${ext}`);
            }
        })
        .then(contentType => ({ext, contentType}))
    );
}
async function getFilename({src, overwrite, contentType, ext}) {
    const id = 
        crypto
            .createHash('sha256')
            .update(src, 'binary')
            .digest('hex');

    const docRef = db.collection('image-cache').doc(id);

    const doc = await docRef.get();

    const filename = `${id}.${ext}`;

    if(!doc.exists || overwrite === true) {
        await docRef.set({src});

        return ({filename, id, isNew: true});
    } else {
        return ({filename, id, isNew: false});
    }
}

function copyImage({from, to, contentType}) {
    return new Promise((resolve, reject) => {
        const out = imageFile(to).createWriteStream({
          metadata: {
            contentType
          }
        });

        needle.get(from)
            .pipe(out)
            .on('done', () => resolve())
            .on('finish', () => resolve())
            .on('error', err => reject(err));
    });
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
