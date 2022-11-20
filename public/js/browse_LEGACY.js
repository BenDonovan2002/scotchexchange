/**
 * Extracts the data typed in the user input boxes and fetches from the search_bottles
 * API endpoint which returns a list of bottles matching the entered information.
 */
function RetrieveBottles() {
    // Grab the user inputs. Returns any if the input is blank
    const distillery_search = document.getElementById("distillery_search").value.length > 0 ? document.getElementById("distillery_search").value : "any";
    const age_search = document.getElementById("age_search").value.length > 0 ? document.getElementById("age_search").value : "any";
    const abv_search = document.getElementById("abv_search").value.length > 0 ? document.getElementById("abv_search").value : "any";
    const vol_search = document.getElementById("vol_search").value.length > 0 ? document.getElementById("vol_search").value : "any";;

    // Checks if all the inputs are blank and if so empties the page
    if (distillery_search == "any"
        && age_search == "any"
        && abv_search == "any"
        && vol_search == "any") {
        document.getElementById("result-div").innerHTML = "";
    } else {
        // Fetch the data from the API endpoint
        fetch(
            `/api/v1/search_bottles/${distillery_search}/${age_search}/${abv_search}/${vol_search}/${results_per_page}/${currentPage}`
        ).then( res => {
            res.json().then( data => {
                let resultCount = data[1];
                CreateResultGrid( data[0], resultCount );
            });
        });
    }


}

var results_per_page = parseInt( document.getElementById("results_per_page").value );
var currentPage = document.getElementById("PaginationSelector") == null ? 0 : parseInt( document.getElementById("PaginationSelector").value );

/**
 * Add an event listener to 'results_per_page' so when it changes, the variables
 * results_per_page are updated.
 */
document.getElementById("results_per_page").addEventListener("change", function () {
    currentPage = 0;
    results_per_page = parseInt( document.getElementById("results_per_page").value );
    RetrieveBottles();
});

/**
 * Redirect the user to a bottle's information page when they press the
 * 'Bottle Information' button.
 * @param {*} t Bottle Model ID
 */
function OnButtonPress(t) {
    window.location.href = "/bottle/" + t;
}

/**
 * Forms a result box for any given bottle to show in the search results
 * @param {*} bottle An object containing the bottle model information
 * @returns The HTML for the bottle result box
 */
function CreateResultItem(bottle) {

    /**
     * If we don't have the age of the bottle stored in the database, then show
     * the vintage instead.
     */
    return (
        `
        <div class='col-sm result_container'>
            <div style="width: 100%; min-height: 300px; border: 1px solid lightgray; border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;">
                <img style="width: 50%; height: auto;" src="${bottle['image_url']}" />
                <h1 style="text-align: center;">${bottle['pageTitle']}</h1>
                <!--<h2>${bottle['age'].toLowerCase() == "n/a" ? bottle['vintage'] : bottle['age'] + " Year Old"}</h2>-->
                <!--<p>Bottled Strength: ${bottle['bottled_strength'].includes("%") ? bottle['bottled_strength'] : ""}</p>-->
                <p>Bottle Volume: ${bottle['bottle_size']}cl</p>
                <!--<button class="btn btn-primary col-6" style="height: 50px;">Add To Cellar</button>-->
                <button onclick="OnButtonPress(${bottle['id']})" class="result-btn btn btn-primary col-6">Bottle Information</button>
                <a href="/api/v1/add_to_wishlist/${bottle['id']}" class="col-6"><button class="result-btn btn btn-primary col-12">Add To Wishlist</button></a>
            </div>
        </div>
        `
    );
}

/**
 * Populates the results div with bottles which match the search criteria
 * entered by the user.
 * @param {*} bottles A list of bottles to display
 */
function CreateResultGrid(bottles, resultCount) {
    resultHTML = ``;

    // Calculate how many results to generate per row
    rowCount = window.innerWidth / 350 > 0 ? Math.floor((window.innerWidth / 350)) : 0;

    for (var i = 0; i < bottles.length; i += rowCount) {
        var rowHTML = ``;
        for (var ii = 0; ii < rowCount && (i + ii) < bottles.length; ii++) {
            rowHTML += CreateResultItem(bottles[i + ii]);
        }

        resultHTML += `<div class="row">${rowHTML}</div>`;

    }

    // Calculate how many pages there are
    let pageCount = Math.ceil(resultCount / results_per_page);

    document.getElementById("result-div").innerHTML = `
    <div class="container-fluid">
        ${resultHTML}
    </div>
    <div id="page_number" class="col-12" >
        <p>Page: </p>
        <select id="PaginationSelector" onchange="ChangePage();" class="col-2 col-md-1">
            ${[...Array(pageCount).keys()].map( (i) => {
                if ( i == currentPage ){
                    return(`<option selected value="${i}">${i + 1}</option>`);
                }
                return(`<option value="${i}">${i + 1}</option>`);
            } )}
        </select>
    </div>`;
}

function ChangePage(){
    // Update the current page
    currentPage = parseInt( document.getElementById( "PaginationSelector" ).value );

    // Scroll to the top of the page
    document.getElementById("result-div").scrollTop = 0;
    window.scroll({
        top: 0, 
        left: 0, 
        behavior: 'smooth' 
       });

    // Update the results
    RetrieveBottles();
}

// Event listener for the distillery input box
document.getElementById("distillery_search").addEventListener("keyup", () => {
    currentPage = 0;
    RetrieveBottles();
});

/**
 * Event listener for the age input box. This also sanitizes
 * the input to make sure only numbers get entered.
 */
document.getElementById("age_search").addEventListener("keyup", () => {
    currentPage = 0;
    const allowed_chars = "0123456789";
    const v = document.getElementById("age_search").value.split("");
    document.getElementById("age_search").value = v.filter(r => allowed_chars.includes(r) ? r : "").join("");
    RetrieveBottles();
})

/**
 * Event listener for the abv input box. This also sanitizes
 * the input to make sure only numbers get entered.
 */
document.getElementById("abv_search").addEventListener("keyup", () => {
    currentPage = 0;
    const allowed_chars = "0123456789";
    const v = document.getElementById("abv_search").value.split("");
    document.getElementById("abv_search").value = v.filter(r => allowed_chars.includes(r) ? r : "").join("");
    RetrieveBottles();
});

/**
 * Event listener for the volume input box. This also sanitizes
 * the input to make sure only numbers get entered.
 */
document.getElementById("vol_search").addEventListener("keyup", () => {
    currentPage = 0;
    const allowed_chars = "0123456789";
    const v = document.getElementById("vol_search").value.split("");
    document.getElementById("vol_search").value = v.filter(r => allowed_chars.includes(r) ? r : "").join("");
    RetrieveBottles();
});

RetrieveBottles();