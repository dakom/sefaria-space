const HEBREW_FONT = `64px TaameyFrankCLM`;
const ENGLISH_FONT = `52px Arial`;
const LINE_SPACE = 80;
const HEB_LINE_DELTA = 60;
const EN_LINE_DELTA = 50;
const MARGIN = 20;
const LANGS = ["en", "he", "mix"];

let gl;
let topicTexture;
let currentTopic;
let artTextures = [];
let personSound;

let sources = [];
let initialSources = [];
let links = [];
let refData = [];
let iframeContainer;
let iframe;
window._myExtensions = {
    init, 
    setContext, 
    setTopicTexture, setArtTexture, 
    enterTopicArea, exitTopicArea, selectTopicArea, 
    enterPersonArea, exitPersonArea, selectPersonArea,
    enterArtArea, exitArtArea, selectArtArea,
    enterExitArea, exitExitArea, selectExitArea,
};

//Called from index.html
async function init() {
    const font = new FontFaceObserver('TaameyFrankCLM');
    await font.load();
 
    setupIframe();

    window.unityInstance = UnityLoader.instantiate("unityContainer", "Build/webgl.json", {onProgress: UnityProgress});


    //startIntro();

    //if not forcing initial selection
    //selectTopicArea();
    //await loadTopic(await getRandomTopic());
    //topic = await loadTopic(new URL(document.location).searchParams.get("topic"));
}

function startIntro() {
    document.getElementById("intro").style.display = "block";

    document.getElementById("begin")
        .addEventListener("click", () => {
            document.getElementById("intro").remove();
            gl.canvas.requestPointerLock();
        });
    
    personSound = new Howl({ src: ['audio/intro.mp3'] });
}
//Called from Unity
function setContext(_gl) {
    gl = _gl;

    startIntro();

    checkFirstReady();
}

function setTopicTexture(texture, width, height) {
    console.log(texture, width, height);
    topicTexture = { texture, width, height };
    checkFirstReady();
}

function setArtTexture (texture, textureId, index, meshWidth, meshHeight) {
    artTextures[index] = {texture, textureId, width: meshWidth, height: meshHeight};
    checkFirstReady();

}

function enterTopicArea() {
}
function exitTopicArea() {
}
function selectTopicArea() {
    openIframe(`topic-chooser/topics.html?cb=${Date.now()}`);
}

function enterExitArea() {
}
function exitExitArea() {
}
function selectExitArea() {
    window.location.href = "https://sefaria-space.web.app";
}

function enterPersonArea() {
    console.log("should play person sound....");
    personSound.play();
}

function exitPersonArea() {
    console.log("should stop all sounds");
    Howler.stop();
}
function selectPersonArea() {
}

function enterArtArea(index) {
}
function exitArtArea(index) {
    const link = links[index];

    if(link != null) {
        if(link.type === "ref" && refData[index]) {
            const {text} = refData[index];
            //speakText(text.join(". "));
        }
    }
}
function selectArtArea(index) {
    const link = links[index];

    if(link != null) {
        if(link.type === "ref") {
            openIframe(`https://sefaria.org/${link.ref}`);
        } else if(link.type === "img") {
            openIframe(link.url);
        }
    } else {
        console.warn("null link");
    }
}

//Internal, bootstrapping
async function checkFirstReady() {
    if(gl == null) {
        return;
    }

    if(topicTexture == null) {
        return;
    }
    
    if(artTextures.filter(x => x != null).length !== 30) {
        return;
    }

    if(currentTopic == null) {
        startInitial();
    } else {
        startTopic();
    }
}

function startInitial() {
    loadTextureImage("logo.png")
        .catch(err => {
            console.error(`unable to load logo!`);
            console.error(err);
        })
        .then(({img}) => {
            makeScaleImage({width: topicTexture.width, height: topicTexture.height, img})
                .then(data => assignTexture({gl, texture: topicTexture.texture, data}))
                .catch(err => {
                    console.error(`unable to assign logo!`);
                    console.error(err);
                });

            for(let index = 0; index < artTextures.length; index++) {
                const {texture, textureId, width, height} = artTextures[index];
                makeScaleImage({width, height, img})
                    .then(data => assignTexture({gl, texture, data}))
                    .catch(err => {
                        console.error(`unable to assign logo!`);
                        console.error(err);
                    })
                    
            }
        })
}

async function startTopic() {
    gl.canvas.requestPointerLock();
    await loadTextures(); 
}

async function getRandomTopic() {
    const resp = await fetch(`https://www.sefaria.org/api/topics?limit=100`);
    const raw = await resp.json();

    return getShuffledArr(raw)[0];
}

// Topic loading
async function loadTopic(topicName, enLabel, heLabel) {
  
    //TODO - not always right
    const id = topicName = topicName.toLowerCase();

    console.log(`changing topic to ${id}`);

    topic = {
        id,
        enLabel,
        heLabel,
        description: {
            en: "",
            he: "",
        },
        refs: [],
        images: [], 
        audio: [], 
    };

    const resp = await fetch(`https://www.sefaria.org/api/topics/${topic.id}?with_refs=1`);
    const raw = await resp.json();
  

    topic.raw = raw;

    topic.description = raw.description;

    const refs = new Set();

    raw.refs
        .filter(ref => !ref.is_sheet)
        .map(ref => ref.ref)
        .forEach(ref => refs.add(ref));
   
    const sheetNames = 
        raw.refs
            .filter(ref => ref.is_sheet)
            .map(ref => ref.ref)
            .map(s => {
                const idx = s.lastIndexOf(' ');
                if(idx == -1) {
                    return null;
                }
                return s.substring(idx + 1);
            })
            .filter(s => s !== null);


    //load sheets
    const sheets = await Promise.all(
        sheetNames
            .map(sheetName => 
                fetch(`https://www.sefaria.org/api/sheets/${sheetName}`)
                    .then(resp => resp.json())
            )
    );

    //use sheet sources to append topic data
    sources = 
        sheets
            .reduce((acc, curr) => acc.concat(curr.sources), [])
            .filter(x => x != null);


    sources
        .map(x => {
            if(x == null) {
                console.log("WTFFF");
            }
            return x;
        })
        .map(({ref, heRef}) => 
            ref != null ? ref
            : heRef != null ? heRef
            : null
        )
        .filter(ref => ref != null)
        .forEach(ref => refs.add(ref));

    //got all refs in set, turn into array for easy indexing
    topic.refs = [...refs];


    //images and audio
    const mediaSources = 
        sources
            .filter(source => source.hasOwnProperty("media"))
            .map(({media}) => media);
        

    topic.images = mediaSources
        .filter(src => ["jpg", "jpeg", "png", "svg", "gif"].indexOf(getExt(src)) !== -1);

    topic.audio = mediaSources
        .filter(src => ["mp3", "wav", "aac", "ogg"].indexOf(getExt(src)) !== -1);


    // topic is loaded, now initialize the sources
    //will randomize the sources except for the first two
    //conceptually it's really FIFO
    initialSources = [];

    const refSources = getShuffledArr(topic.refs.map(ref => ({ref, type: "ref"})));
    const imgSources = getShuffledArr(topic.images.map(img => ({img, type: "img"})));


    const MAX = 2;
    let maxInitialImages = MAX < imgSources.length ? MAX : imgSources.length;

    for(let i = 0; i < maxInitialImages; i++) {
        initialSources.push(imgSources.splice(0,1)[0]);
    }
    if(refSources.length) {
        initialSources.push(refSources.splice(0,1)[0]);
    }


    sources = getShuffledArr(refSources.concat(imgSources));

    currentTopic = topic;

    checkFirstReady();
}


//Texture loading
async function loadTextures() {

    let texts = [];

    if(topic.enLabel == null) {
        texts.push({text: topic.id, dir: "ltr"});
    } else {
        texts.push({text: topic.enLabel, dir: "ltr"});
    }

    if(topic.heLabel != null) {
        texts.push({text: topic.heLabel, dir: "rtl"});
    }

    loadCanvasText({...topicTexture, texts})
        .then(canvas => {
            assignTexture({gl, texture: topicTexture.texture, data: canvas});
        });

    for(let index = 0; index < artTextures.length; index++) {
        loadTexture({...artTextures[index], index});
    }
}

async function loadCanvasText({width, height, texts}) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "white";
    ctx.fillRect(0,0,width,height);

    let yOffset = texts.length == 1 ? height/2 : 130;

    texts.forEach(({text, dir}) => {
        ctx.direction = dir;
        ctx.textAlign = "center";
        ctx.fillStyle = "black";
        ctx.font = `120px Arial`;
        ctx.fillText(text, width/2,yOffset);
        yOffset += 130;
    });

    return canvas;
}

function loadTexture({texture, textureId, index, width, height}) {
    if(!sources.length) {
        console.warn(`no sources left - canvas #${index} will be blank!`);
        return;
    }

    const source = index < initialSources.length
        ? initialSources.pop()
        : sources.pop();


    if(source.type === "ref") {
        const {ref} = source;
        loadCanvasRef({width, height, lang: "mix", ref: source.ref}).then(({canvas, data}) => {


            links[index] = source; 
            refData[index] = data;
            assignTexture({gl, texture, data: canvas});
        })
        .catch(err => {
            console.warn(`unable to load ${ref}! popping a new one off the stack if it exists...`);
            loadTexture(gl, texture, textureId, index, width, height);
        })
    } else if(source.type === "img") {
        const {img} = source;
        //fetch(`http://localhost:8081/getImageCache?src=${img}`)
        //
        //get our cached version of the image so we can guarantee CORS compatibility
        fetch(`https://europe-west1-sefaria-space.cloudfunctions.net/getImageCache?src=${img}`)
            .then(resp => resp.json())
            .then(({filename}) => {
                const url = `https://storage.googleapis.com/sefaria-space-media/image-cache/${filename}`

                console.log(`${index} / ${textureId} is ${img} / ${filename}`);

                loadTextureImage(url)
                    .catch(err => {
                        console.error(`unable to load ${url} (via ${img})!`);
                        console.error(err);
                    })
                    .then(({img}) => makeScaleImage({width, height, img}))
                    .then(data => {
                        links[index] = {...source, url};
                        assignTexture({gl, texture, data});
                    })
                    .catch(err => {
                        console.error(`unable to assign texture ${url} (via ${img})!`);
                        console.error(err);
                    })
            })
            .catch(err => {
                console.error(`unable to load ${img}`);
                console.error(err);
            })
    }
}


//https://stackoverflow.com/a/46161940/784519
function getShuffledArr(arr) {
    const newArr = arr.slice()
    for (let i = newArr.length - 1; i > 0; i--) {
        const rand = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[rand]] = [newArr[rand], newArr[i]];
    }
    return newArr
};

function getExt(filename) {
    const idx = filename.lastIndexOf('.');
    if(idx === -1) {
        return "";
    }

    return filename.substring(idx+1);
}


function loadTextureImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.crossOrigin = "anonymous";

        img.addEventListener("load", () => resolve({
            width: img.naturalWidth,
            height: img.naturalHeight,
            img
        }));
        
        img.addEventListener("error", reject);

        img.src = url;
    })
}
function assignTexture({gl, texture, data}) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
}
async function loadCanvasRef(query) {
    const opts = await validateQuery(query);
    const rawData = await fetchData(opts);
    const data = normalizeData(rawData);
    const canvas = await makeCanvasFromRef(opts) (data);
    return {data, canvas};
}

function validateQuery(query) {
    return new Promise((resolve, reject) => {
        if(!query.hasOwnProperty("width")) {
            return reject("missing query args: width");
        }
        if(!query.hasOwnProperty("height")) {
            return reject("missing query args: height");
        }
        if(!query.hasOwnProperty("ref")) {
            return reject("missing query args: ref");
        }

        const {ref, lang} = query;

        const width = parseInt(query.width);
        const height = parseInt(query.height);
         
        if(LANGS.indexOf(lang) == -1) {
            return reject(`invalid language. must be one of: ${JSON.stringify(LANGS)}`); 
        }
        if(isNaN(width) || width < 0) {
            return reject("bad width"); 
        }
        if(isNaN(height) || height < 0) {
            return reject("bad height "); 
        }

        resolve({ref, lang, width, height})
    });
}

async function fetchData({ref}) {
    const url = `https://www.sefaria.org/api/texts/${ref}`;
    const resp = await fetch(url);
    const json = await resp.json();
    if(json.text == null || typeof json.text.length != "number" || json.text.length === 0) {
        throw new Error("no json.text.length");
    } else {
        return json;
    }
}

function normalizeData(data) {
    if(data.he) {
        data.he = data.he.map(stripHtml);
    }
    if(data.text) {
        data.text = data.text.map(stripHtml);
    }

    return data;
}
function stripHtml(html)
{
   var tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
}

function makeCanvasFromRef(opts) {
    return data => new Promise((resolve, reject) => {

        if(!data.he || !data.text) {
            return reject("missing data!");
        }

        const en = data.text;
        const he = data.he;

        const {width, height, lang} = opts 
        const isEnglish = lang === "en" || lang === "mix";
        const isHebrew = lang === "he" || lang === "mix";

        if(isEnglish && !en.length) {
            return reject("no english text");
        }
        if(isHebrew && !he.length) {
            return reject("no hebrew text");
        }


        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "white";
        ctx.fillRect(0,0,width,height);
        ctx.fillStyle = "black";

        let yOffset = LINE_SPACE * .8;


        if(isHebrew) {
            ctx.direction = "rtl";
            ctx.font = HEBREW_FONT; 
            ctx.textAlign = "center";
            ctx.fillText(data.heRef, width/2, yOffset);
            yOffset += LINE_SPACE;
        }
        if(isEnglish) {
            ctx.direction = "ltr";
            ctx.font = ENGLISH_FONT; 
            ctx.textAlign = "center";
            ctx.fillText(data.ref, width/2, yOffset);
            yOffset += LINE_SPACE;
        }

        let en_idx = 0;
        let he_idx = 0;

        let curr_lang = isHebrew ? 'he' : 'en';

        while(en_idx < en.length && he_idx < he.length) {
            const words = curr_lang == 'he'
                ? he[he_idx].split(' ')
                : en[en_idx].split(' ')

            const xOffset = curr_lang == 'he' ? width-MARGIN : MARGIN;
            const yDelta = curr_lang == 'he' ? HEB_LINE_DELTA : EN_LINE_DELTA;

            let sentance = '';

            if(curr_lang == 'he') {
                he_idx++;
                ctx.direction = "rtl";
                ctx.font = HEBREW_FONT; 
                ctx.textAlign = "right";
            } else if(curr_lang == 'en') {
                en_idx++;
                ctx.direction = "ltr";
                ctx.font = ENGLISH_FONT; 
                ctx.textAlign = "left";
            }

            for(let i = 0; i < words.length; i++) {
                const word = words[i]; 
                let blit = false;
                const textWidth = ctx.measureText(sentance + ' ' + word).width + (MARGIN * 2);
                if(textWidth > width) {
                    blit = true;
                    i--;
                } else {
                    if(sentance == '') {
                        sentance = word;
                    } else {
                        sentance += ' ' + word;
                    }
                    if(i == words.length-1) {
                        blit = true;
                    }
                }

                if(blit) {
                    ctx.fillText(sentance, xOffset, yOffset);
                    yOffset += yDelta;
                    sentance = '';
                }
            }

            if(curr_lang == 'en' && isHebrew) {
                if(he_idx < he.length) {
                    curr_lang = 'he';
                }
            } else if(curr_lang == 'he' && isEnglish) {
                if(en_idx < en.length) {
                    curr_lang = 'en';
                }
            }

            yOffset += LINE_SPACE/2;

            if(yOffset > height) {
                break;
            }
        }

        resolve(canvas);
    });
}

function makeScaleImage({width, height, img}) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas);
    });
}
function makeFakeCanvas({width, height}) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "white";
        ctx.fillRect(0,0,width,height);

        ctx.fillStyle = "black";
        ctx.font = `88px Arial`;
        ctx.fillText("HELLO WORLD!", 10,100);
        //document.getElementById("unityContainer").remove();
        //document.body.appendChild(canvas);
        resolve(canvas);
    });
}

function setupIframe() {
    iframeContainer = document.getElementById("iframeContainer");
    document.getElementById("close-iframe")
        .addEventListener("click", closeIframe);

    iframeContainer.style.display = "none";

    window.addEventListener("message", ({data}) => {
        const {type, topic, enLabel, heLabel} = data;

        switch(type) {
            case "topic":
                closeIframe();
                loadTopic(topic, enLabel, heLabel);
                break;
            case "randomTopic":
                closeIframe();
                getRandomTopic().then(topic => {
                    console.log(topic);
                    loadTopic(topic.slug, topic.primaryTitle.en, topic.primaryTitle.he);
                });
                break;
            default: 
                console.log("unknown event type!");
                break;
        }

    }, false);
}
function openIframe(url) {
    document.exitPointerLock();

    iframeContainer.style.display = "block";
    iframe = document.createElement("iframe");

    iframe.frameBorder = "0";
    iframe.src = url;

    iframeContainer
        .appendChild(iframe);
}

function closeIframe() {
    console.log("closing...");
    if(iframe != null) {
        iframe.remove();
        iframe = null;
    }

    iframeContainer.style.display = "none";

    gl.canvas.requestPointerLock();
}

function speakText(text) {
    console.log(text);
}
