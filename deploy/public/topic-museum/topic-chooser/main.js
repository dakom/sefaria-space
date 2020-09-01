const topicsListElem = document.getElementById("topicsList");
const headerElem = document.getElementById("header");
const backElem = document.getElementById("back");

loadTopics();

backElem.addEventListener("click", () => loadTopics());

function loadTopics(item) {
    while(topicsListElem.firstChild) {
        topicsListElem.firstChild.remove();
    }

    if(item == null) {
        headerElem.innerText = "Choose a category";
        backElem.style.display = "none";


        fetch("https://www.sefaria.org/api/tag-category")
            .then(resp => resp.json())
            .then(topics => {

                appendItem(broadcastRandomTopicSelect) ({tag: "Random", heTag: "אַקרַאִי", slug: ""});
                topics.forEach(appendItem(loadTopics));
            });
    } else {
        const {tag, heTag, slug} = item;

        backElem.style.display = "block";
        headerElem.innerText = `Choose a topic in ${tag} / ${heTag}`;
        fetch(`https://www.sefaria.org/api/tag-category/${tag}`)
            .then(resp => resp.json())
            .then(topics => {
                console.log(topics, topics.length);
                if(topics.length) {
                    topics.forEach(appendItem(loadTopics));
                } else {
                    window.parent.postMessage({type: "topic", topic: slug, enLabel: tag, heLabel: heTag} , "*");
                }
            });
    }

}

function appendItem(callback) {
    return ({tag, heTag, slug}) => {
        const elem = document.createElement("div");
        elem.classList.add(["item"]);

        elem.innerHTML = `
            <div class="lines">
                <div class="en">${tag}</div>
                <div class="he">${heTag}</div>
            </div>
        `;

        elem.addEventListener("click", () => callback({tag, heTag, slug}));

        topicsListElem.appendChild(elem);

    }
}

function broadcastRandomTopicSelect({tag, heTag, slug}) {
    window.parent.postMessage({type: "randomTopic"} , "*");
}

