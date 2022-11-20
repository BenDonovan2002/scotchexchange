/**
 * Retrieves all of the bottles in the user's wishlist
 * from the database
 * @returns Array of DB objects which show the bottle IDs for the user's wishlist
 */
async function retrieveUserWishlist() {
    let r = await fetch('/api/v1/get_wishlist_content');
    let wishlistContent = await r.json();

    return wishlistContent;
}

/**
 * Retrieves information about a bottle
 * @param {number} bottleID The ID of the bottle to retrieve information for
 * @returns Object containing relevant information for the bottle
 */
async function getBottleInformation(bottleID) {
    let r = await fetch(`/api/v1/bottle_information/${bottleID}`);
    let bottleInformation = await r.json();

    return bottleInformation;
}

/**
 * Creates an array containing all of the bottles in the user's wishlist
 * and information about those bottles.
 * @returns Array of user's wishlist bottles
 */
async function buildWishlistArray() {
    let wishlistContent = await retrieveUserWishlist();
    let wishlistArray = [];

    for (let i = 0; i < wishlistContent.length; i++) {
        let bottleInformation = await getBottleInformation(wishlistContent[i].bottle_id);
        wishlistArray.push(bottleInformation);
    }

    return wishlistArray;
}

function buildItemHTML(bottleInformation) {
    console.log(bottleInformation);
    /*return `
    <div class="ListItem">
        <img style="height: 90%; margin-left: 5px;" src=${bottleInformation.image_url}></img>
        <div style="width: 100%; height: 90%; padding: 0; margin: 0px 20px;">
            <a href="/bottle/1"><h1>${bottleInformation.distillery}</h1>
            <h2 style="font-size: 20px;">${bottleInformation.age} Year Old</h2></a>
            <div class="col-12 d-flex flex-wrap justify-content-around">
                <button class="col-12 btn-wishlist"></button>
                <button class="col-12 btn-wishlist"></button>
            </div>
        </div>
        
    </div>
    `;*/

    return `
    <div class="ListItem">
        <img src=${bottleInformation.image_url}></img>
        <div class="col-12 col-md-4">
            <a href="/bottle/${bottleInformation.id}"><h1>${bottleInformation.pageTitle}</h1>
            <div class="div-item-button" >
                <a href="/bottle/${bottleInformation.id}?purchased=true"><button class="col-8 col-md-6 btn-wishlist">Purchased</button></a>
                <a href="/comparison/bottle/${bottleInformation.id}"><button class="col-8 col-md-6 btn-wishlist">Where Should I Buy?</button></a>
                <a href="/api/v1/remove_from_wishlist/${bottleInformation.id}"><p class="col-12 col-md-6 text-center">Remove From Wishlist</p></a>
            </div>
        </div>
    </div>
    `;
}

function buildPageList(wishlistArray) {
    listHTML = ``;
    for (let i = 0; i < wishlistArray.length; i++) {
        listHTML += buildItemHTML(wishlistArray[i]);
    }

    return listHTML;
}

buildWishlistArray().then(r => {
    let listHTML = buildPageList(r);

    document.getElementById("ResultsPane").innerHTML = listHTML;
});