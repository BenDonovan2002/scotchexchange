function GetNewsHeadlineString (){
    return new Promise(function(resolve, reject) {
        let headlineString = "";
        fetch("/api/v1/get_news_articles").then( ( response ) => {
            response.json().then( ( data ) => {
                
                headlineString = data.join(" | ");

                resolve(headlineString);
            } );
        } );
    });
}

function setChyronTime() {
    let rootElement = document.querySelector(":root");

    // Default: 0.067
    let chyronTime = document.getElementById("chyron-text").innerText.length * 0.1;

    rootElement.style.setProperty("--chyron-time", `${chyronTime}s`);
}
