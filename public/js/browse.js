/**
 * Extracts the data typed in the user input boxes and fetches from the search_bottles
 * API endpoint which returns a list of bottles matching the entered information.
 */
function RetrieveBottles() {
    // Grab the user inputs. Returns any if the input is blank
    const nameSearch = document.getElementById("name_search").value.length > 0 ? document.getElementById("name_search").value : "any";

    // Checks if all the inputs are blank and if so empties the page
    if (nameSearch == "any") {
        document.getElementById("result-div").innerHTML = "";
    } else {
        // Fetch the data from the API endpoint
        fetch(
            `/api/v1/search_bottles/${nameSearch}/${results_per_page}/${currentPage}`
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

    /*
        <!--<h2>${bottle['age'].toLowerCase() == "n/a" ? bottle['vintage'] : bottle['age'] + " Year Old"}</h2>-->
        <!--<p>Bottled Strength: ${bottle['bottled_strength'].includes("%") ? bottle['bottled_strength'] : ""}</p>-->
    */

    /**
     * If we don't have the age of the bottle stored in the database, then show
     * the vintage instead.
     */
    return (
        `
        <div class='col-sm result_container'>
            <div class="result_content">
                <img style="width: 50%; height: auto;" src="${bottle['image_url']}" />
                <h1 style="text-align: center;">${bottle['pageTitle']}</h1>
                
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

    document.getElementById("name_search").blur();
    document.getElementById("button_search").blur();
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

document.getElementById("button_search").addEventListener("click", () => {
    currentPage = 0;
    RetrieveBottles();
});

document.getElementById("name_search").addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        currentPage = 0;
        RetrieveBottles();
    }
});


RetrieveBottles();