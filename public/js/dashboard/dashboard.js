/**
 * An object containing the data for a single bottle in the user's cellar
 */
class CellarListItem {
    constructor(cellarID, bottleID, pageTitle, pageDescription, distillery, age, vintage, region, bottler,
        caskType, bottledStrength, bottleSize, distilleryStatus, priceHistory, purchaseDate, purchasePrice, mostProfitableAuctionHouse) {
        this.cellarID = cellarID;
        this.bottleID = bottleID;
        this.pageTitle = pageTitle;
        this.pageDescription = pageDescription;
        this.distillery = distillery;
        this.age = age;
        this.vintage = vintage;
        this.region = region;
        this.bottler = bottler;
        this.caskType = caskType;
        this.bottledStrength = bottledStrength;
        this.bottleSize = bottleSize;
        this.distilleryStatus = distilleryStatus;
        this.priceHistory = priceHistory;
        this.purchaseDate = purchaseDate;
        this.purchasePrice = purchasePrice;
        this.mostProfitableAuctionHouse = mostProfitableAuctionHouse;
    }

    // anchor

    GenerateItemHTML(index, quantity) {
        let quantityHTML = groupBottles ? `Quantity: ${quantity}` : '';
        return `
        <li id="cellarList_${index}" ind="${index}" class="cellar-list-item col-12 d-flex justify-content-between" >
          <div>
            <h1>${this.pageTitle}</h1>
            ${groupBottles ? `<h2>Quantity: ${quantity}</h2>` : ""}
          </div>
          <input id=cellarList_${index}_Checkbox type="checkbox"; ></input>
        </li>
      `;
    }
}

/**
 * Creates a filter system to display different types of data
 * in the user's cellar
 */
class SortFilters {
    static bottles = 0;
    static distillery = 1;
    static region = 2;
    static cellar = 3;
}

/** @type CellarListItem[] */
var cellarListItems = [];

/** @type String[] */
var cellarListDistilleries = [];

/** @type String[] */
var cellarListRegions = [];

/**@type boolean */
var groupBottles = false;

/** @type CellarListItem[] */
var checkedCellarItems = [];

/** @type number */
var sortFilter = SortFilters.bottles;

/** @type number */
var numberChecked = 0;

let cutOffDate = null;

let cellarContent = null;
let bottleAggregates = [];

function CheckAllBottleIDs(bottleIDs) {
    if (bottleIDs != null && bottleIDs != undefined) {
        let listItems = document.getElementsByClassName("cellar-list-item");

        for (var i = 0; i < listItems.length; i++) {
            if (sortFilter == SortFilters.bottles) {
                if (bottleIDs.includes(cellarListItems[listItems[i].getAttribute("ind")].bottleID)) {
                    listItems[i].children[1].click();
                }
            } else {
                if (bottleIDs.includes(cellarListItems[listItems[i].getAttribute("ind")].distillery)
                    || bottleIDs.includes(cellarListItems[listItems[i].getAttribute("ind")].region)) {
                    listItems[i].children[1].click();
                }
            }

        }
    }
}

function TimeFrameButtonPressed(timeFrame) {
    let checkedBottleIDs = null;
    if (sortFilter == SortFilters.bottles) {
        checkedBottleIDs = checkedCellarItems.map(item => item.bottleID);
    } else {
        checkedBottleIDs = checkedCellarItems;
    }
    sessionStorage.setItem("checkedBottleIDs", JSON.stringify(checkedBottleIDs));
    if (document.getElementById("filter_element").getAttribute("filter") == "bottles") {
        location.href = "/dashboard/timescale=" + timeFrame;
    } else {
        location.href = "/dashboard/timescale=" + timeFrame + "/filter=" + document.getElementById("filter_element").getAttribute("filter");
    }
}

/**
 * Changes the time frame shown on the graph
 * @param {string} timeFrame 
 */
function ChangeTimeFrame(timeFrame) {
    let date = new Date();
    let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (timeFrame == "6M") {
        date.setMonth(date.getMonth() - 6);
        cutOffDate = months[date.getMonth()] + " " + date.getFullYear();
    } else if (timeFrame == "1Y") {
        date.setFullYear(date.getFullYear() - 1);
        cutOffDate = months[date.getMonth()] + " " + date.getFullYear();
    } else if (timeFrame == "3Y") {
        date.setFullYear(date.getFullYear() - 3);
        cutOffDate = months[date.getMonth()] + " " + date.getFullYear();
    } else if (timeFrame == "YTD") {
        date.setMonth(0);
        cutOffDate = months[date.getMonth()] + " " + date.getFullYear();
    } else {
        cutOffDate = null;
    }
}

/**
 * 
 * @param {*} priceHistory 
 * @returns 
 */
function getAveragePriceHistoryFromTemplate(priceHistory) {
    let delimiterNames = Object.keys(priceHistory);
    let averagePriceHistory = JSON.parse(JSON.stringify(priceHistory));

    for (var i = 0; i < delimiterNames.length; i++) {
        let monthYearNames = Object.keys(averagePriceHistory[delimiterNames[i]]);
        for (var ii = 0; ii < monthYearNames.length; ii++) {
            let monthYearPrices = averagePriceHistory[delimiterNames[i]][monthYearNames[ii]];

            if (monthYearPrices.length > 1) {
                let total = 0;
                for (var j = 0; j < monthYearPrices.length; j++) {
                    total += parseFloat(monthYearPrices[j]);
                }

                let averagePrice = total / monthYearPrices.length;

                averagePriceHistory[delimiterNames[i]][monthYearNames[ii]] = [averagePrice.toString()];
            }
        }
    }

    return averagePriceHistory;
}

function GetTotalCellarInvestment() {
    let totalValue = 0;
    for (var i = 0; i < cellarListItems.length; i++) {
        totalValue += parseFloat(cellarListItems[i].purchasePrice);
    }

    return totalValue;
}

function GetTotalCellarValue() {
    let totalValue = 0;
    for (var i = 0; i < cellarListItems.length; i++) {
        totalValue += parseFloat(GetLatestBottlePrice(cellarListItems[i].priceHistory)[1]);
        //console.log( GetLatestBottlePrice(cellarListItems[i].priceHistory) );
    }

    return totalValue;
}

function sortMonthYears(monthYears) {
    const Months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    let months = monthYears.map((x) => x);

    months.sort((a, b) => {
        let a_date = a.split(" ");
        let b_date = b.split(" ");

        if (a_date[1] !== b_date[1]) return parseInt(a_date[1]) - parseInt(b_date[1]);

        return Months.indexOf(a_date[0]) - Months.indexOf(b_date[0]);
    });

    return months;
}

/**
 * Creates the HTML for the list in the cellar
 */
function buildCellarListHTML() {

    let listHTML = ``;

    if (sortFilter == SortFilters.bottles) {
        if (groupBottles) {
            /**
             * Loop through each cellarListItem and add it to the HTML
             * string literal. Only do this, however, if it has not been previously
             * added to the list. This is tracked using the prevList variable which stores
             * all the IDs of the bottles already added
             */
            let prevBottles = [];
            for (var i = 0; i < cellarListItems.length; i++) {
                if (!prevBottles.includes(cellarListItems[i].bottleID)) {
                    listHTML += cellarListItems[i].GenerateItemHTML(i, retrieveBottleQuantity(cellarListItems[i].bottleID));
                    prevBottles.push(cellarListItems[i].bottleID);
                }
            }
        } else {
            for (var i = 0; i < cellarListItems.length; i++) {
                listHTML += cellarListItems[i].GenerateItemHTML(i);
            }
        }

        listHTML += `
            <a href="/upload_spreadsheet/" id="add-button"><button class="btn btn-primary">Upload Bottles From Spreadsheet</button></a>
        `;

    } else if (sortFilter == SortFilters.distillery) {
        for (var i = 0; i < cellarListDistilleries.length; i++) {
            listHTML += buildDistilleryListItemHTML(i, cellarListDistilleries[i]);
        }
    } else if (sortFilter == SortFilters.region) {
        for (var i = 0; i < cellarListRegions.length; i++) {
            listHTML += buildRegionListItemHTML(i, cellarListRegions[i]);
        }
    }

    if (listHTML == ``) {
        listHTML = `<h4>No bottles found</h4>`;
    } else {
        if (sortFilter == SortFilters.bottles) {
            document.getElementById("groupButton").style.display = "block";
        }
        document.getElementById("checkAllButton").style.display = "block";
    }


    document.getElementById("CellarListContainer").innerHTML = listHTML;

    let listItems = document.getElementsByClassName("cellar-list-item");

    for (var i = 0; i < listItems.length; i++) {
        let currentListItem = listItems[i];

        // Add the event listener to the list item
        document.getElementById(currentListItem.id).addEventListener('click', (event) => {
            onCellarListPress(currentListItem.id);
        });

        // Add the event listener to the checkbox as well
        document.getElementById(`${currentListItem.id}_Checkbox`).addEventListener('click', (event) => {
            onCellarListPress(currentListItem.id);
        });

    }

    CheckAllBottleIDs(
        sessionStorage.getItem("checkedBottleIDs")
    );

}

function createTimescaleAxis() {

    let months = [];

    let bottles = null;

    switch (sortFilter) {
        case SortFilters.bottles:
            bottles = checkedCellarItems;
            break;
        case SortFilters.distillery:
            bottles = getDistilleryBottles(checkedCellarItems);
            break;
        case SortFilters.region:
            bottles = getRegionBottles(checkedCellarItems);
            break;
        case SortFilters.cellar:
            bottles = cellarListItems;
            break;
    }

    for (var i = 0; i < bottles.length; i++) {
        let bottleTimeScale = Object.keys(bottles[i].priceHistory);

        bottleTimeScale.forEach(date => {
            if (!months.includes(date)) {
                months.push(date);
            }
        });
    }

    months = sortMonthYears(months);


    return months;
}

function checkAllItems() {
    let listItems = document.getElementsByClassName("cellar-list-item");
    let checkAllButton = document.getElementById("checkAllButton");

    if (checkAllButton.innerText == "Check All") {
        for (var i = 0; i < listItems.length; i++) {
            onCellarListPress(listItems[i].id, true);
        }

        checkAllButton.innerText = "Uncheck All";
        numberChecked = document.getElementsByClassName("cellar-list-item").length;
    } else {
        for (var i = 0; i < listItems.length; i++) {
            onCellarListPress(listItems[i].id, false);
        }

        checkAllButton.innerText = "Check All";
        numberChecked = 0;
    }

}

function onCellarListPress(id, force) {

    let cellarListItem = document.getElementById(`${id}_Checkbox`);

    if (sortFilter == SortFilters.bottles) {
        sessionStorage.setItem("filter", "bottles");
        if (force == undefined) {
            cellarListItem.checked = !cellarListItem.checked;

            if (cellarListItem.checked) {
                numberChecked++;
                checkedCellarItems.push(cellarListItems[document.getElementById(id).getAttribute("ind")]);
            } else {
                numberChecked--;
                let cellarItem = cellarListItems[document.getElementById(id).getAttribute("ind")];
                checkedCellarItems = checkedCellarItems.filter(item => item.cellarID != cellarItem.cellarID);
            }
        } else if (force == true) {
            numberChecked++;
            cellarListItem.checked = true;
            checkedCellarItems = cellarListItems.map((x) => x);
        } else {
            numberChecked--;
            cellarListItem.checked = false;
            checkedCellarItems = [];
        }
    } else if (sortFilter == SortFilters.distillery) {
        sessionStorage.setItem("filter", "distillery");
        if (force == undefined) {
            cellarListItem.checked = !cellarListItem.checked;

            if (cellarListItem.checked) {
                numberChecked++;
                checkedCellarItems.push(cellarListDistilleries[document.getElementById(id).getAttribute("ind")]);
            } else {
                numberChecked--;
                let cellarItem = cellarListDistilleries[document.getElementById(id).getAttribute("ind")];
                checkedCellarItems = checkedCellarItems.filter(item => item != cellarItem);
            }
        } else if (force == true) {
            numberChecked++;
            cellarListItem.checked = true;
            checkedCellarItems = cellarListDistilleries.map((x) => x);
        } else {
            numberChecked--;
            cellarListItem.checked = false;
            checkedCellarItems = [];
        }
    } else if (sortFilter == SortFilters.region) {
        sessionStorage.setItem("filter", "region");
        if (force == undefined) {
            cellarListItem.checked = !cellarListItem.checked;

            if (cellarListItem.checked) {
                numberChecked++;
                checkedCellarItems.push(cellarListRegions[document.getElementById(id).getAttribute("ind")]);
            } else {
                numberChecked--;
                let cellarItem = cellarListRegions[document.getElementById(id).getAttribute("ind")];
                checkedCellarItems = checkedCellarItems.filter(item => item != cellarItem);
            }
        } else if (force == true) {
            numberChecked++;
            cellarListItem.checked = true;
            checkedCellarItems = cellarListRegions.map((x) => x);
        } else {
            numberChecked--;
            cellarListItem.checked = false;
            checkedCellarItems = [];
        }
    } else {
        sessionStorage.setItem("filter", "cellar");
    }

    sessionStorage.setItem("checkedCellarItems", JSON.stringify(checkedCellarItems));

    if (numberChecked > 0) {
        checkAllButton.innerText = "Uncheck All";
    } else {
        checkAllButton.innerText = "Check All";
    }

    DrawChart();

}

function CheckIfMonthYearIsAfter(monthYearToCheck, monthYearToCheckAgainst) {

    let months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    let monthYearToCheckSplit = monthYearToCheck.split(" ");
    let monthYearToCheckAgainstSplit = monthYearToCheckAgainst.split(" ");

    if (parseInt(monthYearToCheckAgainstSplit[1]) < parseInt(monthYearToCheckSplit[1])) {
        // The year we're validating is after the year we're checking against
        return true;
    } else if (parseInt(monthYearToCheckAgainstSplit[1]) > parseInt(monthYearToCheckSplit[1])) {
        // The year we're validating is before the year we're checking against
        return false;
    } else {
        // The years are the same, check the months
        if (months.indexOf(monthYearToCheckSplit[0].toLowerCase()) >= months.indexOf(monthYearToCheckAgainstSplit[0].toLowerCase())) {
            // The month we're validating is after the month we're checking against
            return true;
        } else {
            // The month we're validating is before the month we're checking against
            return false;
        }
    }

    return false;
}

function TruncatePriceHistoryToAfterMonthYear(priceHistory, cutoffMonthYear) {
    let truncatedPriceHistory = {};

    let salePoints = Object.keys(priceHistory);

    for (let i = 0; i < salePoints.length; i++) {
        if (CheckIfMonthYearIsAfter(salePoints[i], cutoffMonthYear)) {
            //console.log( salePoints[i] );
            truncatedPriceHistory[salePoints[i]] = priceHistory[salePoints[i]];
        }
    }

    return truncatedPriceHistory;
}

/**
* Retrieves information on a bottle tempalate from the SQL database 
* by taking in an object which contains information about the user's
* cellar and which bottles they own. This new object then gets put into
* the cellarListItems array. 
* @param {any} bottleTemplate The object containing information about the user's bottle
*/
async function createCellarListItemFromTemplate(bottleTemplate) {

    //console.log( bottleTemplate.bottle_id );

    let bottle_info = null;

    for ( let i = 0; i < bottleAggregates.length; i++ ){
        if ( bottleAggregates[i][0].modelID == bottleTemplate.bottle_id ){
            bottle_info = bottleAggregates[i];
        }
    }

    //bottleAggregates.push(bottle_info);
    let template_info = bottle_info[0];
    let bottle_prices = cutOffDate == null ? bottle_info[1]
        : TruncatePriceHistoryToAfterMonthYear(bottle_info[1], cutOffDate);

    /*
      Create a list of distilleries for when we're creating the
      HTML list of distilleries
    */
    if (!cellarListDistilleries.includes(template_info.distillery)) {
        cellarListDistilleries.push(template_info.distillery);
    }

    /*
      Create a list of regions for when we're creating the
      HTML list of regions
    */
    if (!cellarListRegions.includes(template_info.region)) {
        cellarListRegions.push(template_info.region);
    }

    cellarListItems.push(new CellarListItem(
        bottleTemplate.id,
        bottleTemplate.bottle_id,
        template_info.pageTitle,
        template_info.pageDescription,
        template_info.distillery,
        template_info.age,
        template_info.vintage,
        template_info.region,
        template_info.bottler,
        template_info.cask_type,
        template_info.bottled_strength,
        template_info.bottle_size,
        template_info.distillery_status,
        bottle_prices,
        bottleTemplate.purchase_date,
        bottleTemplate.purchase_price,
        template_info.mostProfitableAuctionHouse
    ));
}

async function createCellarList() {
    cellarListItems = [];
    //let res = await fetch("/api/v1/get_cellar_content");
    cellarContent = JSON.parse(document.getElementById("filter_element").getAttribute("cellarcontent"));
    bottleAggregates = JSON.parse( document.getElementById("filter_element").getAttribute("aggregatebottles") );

    for (var i = 0; i < cellarContent.length; i++) {
        createCellarListItemFromTemplate(cellarContent[i]).then(() => {
            if ( cellarListItems.length == cellarContent.length ){
                if (sortFilter == SortFilters.cellar) {
                    DrawChart();
                } else {
                    buildCellarListHTML();
                }
            }
        });
    }
}

var myChart = null;

var mouseXPos = 0;

const verticalHover = chart => {
    if (chart.tooltip?._active?.length) {
        //let x = chart.tooltip._active[0].element.x;
        let x = mouseXPos;
        let yAxis = chart.scales.y;
        let ctx = chart.ctx;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, yAxis.top);
        ctx.lineTo(x, yAxis.bottom);
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#B74601';
        ctx.stroke();
        ctx.restore();
    }
}

/**
 * Gets the latest sale price for a bottle based on it's price history.
 * If it has multiple data points for any given month, then the average
 * of those prices is taken.
 * @param {any} priceHistory The price history of a bottle
 * @returns The latest sale price for a bottle
 */
function GetLatestBottlePrice(priceHistory) {

    let months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

    let priceHistoryIndices = Object.keys(priceHistory);

    let latestPrice = null;

    for (let i = 0; i < priceHistoryIndices.length; i++) {
        let priceHistoryIndex = priceHistoryIndices[i];
        if (latestPrice == null) {
            // If the latest price is null, then we need to set it to the first price
            latestPrice = [priceHistoryIndex, priceHistory[priceHistoryIndex]];
        } else {

            // Get the month and year of the price in latestPrice
            let selectedMonth = latestPrice[0].split(" ")[0].toLowerCase();
            let selectedYear = parseInt(latestPrice[0].split(" ")[1]);

            // Get the month and year of the price in priceHistoryIndex
            let currentMonth = priceHistoryIndex.split(" ")[0].toLowerCase();
            let currentYear = parseInt(priceHistoryIndex.split(" ")[1]);

            // If the year of priceHistoryIndex is greater than the year of latestPrice, then we need to update latestPrice
            if (currentYear > selectedYear) {
                latestPrice = [priceHistoryIndex, parseFloat(priceHistory[priceHistoryIndex])];
            }

            // If the year of priceHistoryIndex is equal to the year of latestPrice, then we need to check the month
            if (currentYear == selectedYear) {
                // If the month of priceHistoryIndex is greater than the month of latestPrice, then we need to update latestPrice
                if (months.indexOf(currentMonth) > months.indexOf(selectedMonth)) {
                    latestPrice = [priceHistoryIndex, parseFloat(priceHistory[priceHistoryIndex])];
                }
            }

        }
    }

    return latestPrice;
}

function DrawChart() {
    let timeScaleAxis = createTimescaleAxis();
    switch (sortFilter) {
        case SortFilters.bottles:
            DrawBottleChart(timeScaleAxis);
            CreateStatsTableBottle();
            break;
        case SortFilters.distillery:
            let distilleryHistoryObject = getAveragePriceHistoryFromTemplate(getPriceHistoryByDistillery());
            DrawDistilleryChart(timeScaleAxis, distilleryHistoryObject);
            CreateStatsTableDistillery();
            break;
        case SortFilters.region:
            let regionHistoryObject = getAveragePriceHistoryFromTemplate(getPriceHistoryByRegion());
            DrawRegionChart(timeScaleAxis, regionHistoryObject);
            CreateStatsTableRegion();
            break;
        case SortFilters.cellar:
            DrawCellarChart(timeScaleAxis);
            CreateStatsTableCellar();
            break;
    }

    // Add a listener to the canvas element to detect when the mouse is hovering over it
    // and log the mouse position to the console
    if (myChart != null) {
        myChart.canvas.addEventListener("mousemove", (e) => {
            let rect = myChart.canvas.getBoundingClientRect();
            let x = e.clientX - rect.left;
            mouseXPos = x;
        });
    }

    // Adjust canvas attributes such that the overlay and the chart are the same size

    let clientWidth = document.getElementById("DashboardChart").clientWidth;
    let clientHeight = document.getElementById("DashboardChart").clientHeight;

    document.getElementById("DashboardChart").setAttribute("width", clientWidth);
    document.getElementById("DashboardChart").setAttribute("height", clientHeight);

    document.getElementById("OverlayChart").setAttribute("width", clientWidth * PR);
    document.getElementById("OverlayChart").setAttribute("height", clientHeight * PR);
}

function getAverageBottleValue(bottlePriceHistory) {
    let totalPrice = 0;

    let priceValueHistory = Object.values(bottlePriceHistory);

    for (let i = 0; i < priceValueHistory.length; i++) {
        totalPrice += parseFloat(priceValueHistory[i]);
    }

    return totalPrice / priceValueHistory.length;
}

/**
* Get the total value of the user's cellar for each month in which
* we have data for it. 
* @param {*} cellarContent A list of bottles in the user's cellar
* @returns An object containing each month to display and it's corresponding value
*/
async function getAverageValueByMonthYear(cellarContent) {

    console.log("Getting average value by month year");

    let bottlePriceHistoryList = bottleAggregates.map(bottleAggregate => bottleAggregate[1]);

    /**
     * Go through each bottle in the user's cellar and retrieve the
     * price history for it. Then, store it in bottlePriceHistoryList.
     */
    /*for (let i = 0; i < cellarContent.length; i++) {
        let res = await fetch(`/api/v1/get_aggregate/${cellarContent[i]['bottle_id']}`);
        let priceHistory = await res.json();
        bottlePriceHistoryList.push(priceHistory[1]);
    }*/

    let monthYearsList = [];

    /**
     * Get every month in which we have pricing data for atleast one bottle
     * in the user's cellar. This will form the base for the time axis on the chart.
     * This is then ordered by chronological order and put into monthYearsList
     */
    for (let i = 0; i < bottlePriceHistoryList.length; i++) {
        let bottleMonths = Object.keys(bottlePriceHistoryList[i]);
        for (let ii = 0; ii < bottleMonths.length; ii++) {
            if (!monthYearsList.includes(bottleMonths[ii])) {
                monthYearsList.push(bottleMonths[ii]);
            }
        }
    }

    monthYearsList = sortMonthYears(monthYearsList);

    let averageMonthYearPriceObject = {};

    /**
     * Go through each month in monthYearsList and get the values for each bottle
     * in the user's cellar for that month. Add them all together and store them in
     * averageMonthYearPriceObject in the format "Month Year": Value.
     * 
     * Not all bottles have a price value for every month, and as such if we find this is the
     * case we just work out the average value for the bottle across all of our data and use that
     * value instead.
     */

    for (let i = 0; i < monthYearsList.length; i++) {
        if (averageMonthYearPriceObject[monthYearsList[i]] == undefined) {
            averageMonthYearPriceObject[monthYearsList[i]] = 0;
        }

        for (let ii = 0; ii < bottlePriceHistoryList.length; ii++) {

            averageMonthYearPriceObject[monthYearsList[i]] += bottlePriceHistoryList[ii][monthYearsList[i]] != undefined
                ? parseFloat(bottlePriceHistoryList[ii][monthYearsList[i]]) : getAverageBottleValue(bottlePriceHistoryList[ii]);
        }
    }

    return averageMonthYearPriceObject;
}

function checkDashFilter() {
    switch (document.getElementById("filter_element").getAttribute("filter")) {
        case "distillery":
            sortFilter = SortFilters.distillery;
            break;
        case "region":
            sortFilter = SortFilters.region;
            break;
        case "cellar":
            sortFilter = SortFilters.cellar;
            break;
        default:
            sortFilter = SortFilters.bottles;
            break;
    }

    let timeFrame = document.getElementById("filter_element").getAttribute("timeScale").replace(/[^a-zA-Z0-9]/g, '');
    ChangeTimeFrame(timeFrame);

    createCellarList();
}

document.getElementById("BottleFilterButton").addEventListener("click", () => {
    sessionStorage.setItem("checkedBottleIDs", null);
    location.href = "/dashboard/";
});

document.getElementById("DistilleryFilterButton").addEventListener("click", () => {
    sessionStorage.setItem("checkedBottleIDs", null);
    location.href = "/dashboard/filter=distillery/";
});

document.getElementById("RegionFilterButton").addEventListener("click", () => {
    sessionStorage.setItem("checkedBottleIDs", null);
    location.href = "/dashboard/filter=region/";
});

document.getElementById("CellarFilterButton").addEventListener("click", () => {
    sessionStorage.setItem("checkedBottleIDs", null);
    location.href = "/dashboard/filter=cellar/";
});

function FormatValueString(value) {
    return value.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

window.onload = () => {
    GetNewsHeadlineString().then((headline) => {
        document.getElementById("chyron-text").innerText = headline;
        setChyronTime();
    });
    checkDashFilter();
}

let resetChart;
addEventListener('resize', () => {
    clearTimeout(resetChart);
    resetChart = setTimeout(() => {
        if (myChart) {
            myChart.destroy();
            DrawChart();
        }
    }, 100);
});


// Drag to see price functionality
const PIXEL_RATIO = () => {
    var ctx = document.createElement("canvas").getContext("2d"),
        dpr = window.devicePixelRatio || 1,
        bsr = ctx.webkitBackingStorePixelRatio ||
            ctx.mozBackingStorePixelRatio ||
            ctx.msBackingStorePixelRatio ||
            ctx.oBackingStorePixelRatio ||
            ctx.backingStorePixelRatio || 1;

    return dpr / bsr;
};

let canvas = document.getElementById("DashboardChart");
let overlay = document.getElementById("OverlayChart");

let overlayContext = overlay.getContext("2d");

let startIndex = 0;

let PR = PIXEL_RATIO();

let overlayRectangle = {
    startX: 0,
    startY: 0,
    width: 0,
}

let drag = false;

canvas.addEventListener("mousedown", e => {
    let points = myChart.getElementsAtEventForMode(e, 'index', { intersect: false });

    //console.log(points);

    if (points[0] != undefined) {
        startIndex = points[0].index;

        // get the x position of startIndex on the canvas and store it in a variable


        let rect = canvas.getBoundingClientRect();
        let x = myChart.scales.x.getPixelForValue(startIndex);
        let y = e.clientY - rect.top;

        overlayRectangle.startX = x;
        overlayRectangle.startY = y;

        drag = true;
    }

});

canvas.addEventListener("mousemove", e => {
    let rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    if (drag) {
        overlayRectangle.width = x - overlayRectangle.startX;
        overlayContext.clearRect(0, 0, overlay.width, overlay.height);
        overlayContext.fillStyle = "rgba(0, 0, 0, 0.5)";
        overlayContext.fillRect(overlayRectangle.startX * PR, myChart.chartArea.top * PR, overlayRectangle.width * PR, myChart.chartArea.bottom * PR - myChart.chartArea.top * PR);
    } /*else {
        overlayContext.clearRect(0, 0, overlay.width, overlay.height);
    }*/

});

canvas.addEventListener("mouseup", e => {
    //overlayContext.clearRect(0, 0, overlay.width, overlay.height);

    let points = myChart.getElementsAtEventForMode(e, 'index', {
        intersect: false
    });

    if (points[0] != undefined) {
        let finishIndex = points[0].index;

        // myChart.config.data.datasets[0].data
        let datasets = myChart.config.data.datasets;
        let chartValues = [];

        // Get the average value for each month and store it in an array 
        for (let i = 0; i < datasets[0].data.length; i++) {
            let totalMonthlyValue = 0;
            for (let j = 0; j < datasets.length; j++) {
                if (datasets[j].data[i] != null) {
                    totalMonthlyValue += parseFloat(datasets[j].data[i]);
                }
            }

            chartValues.push((totalMonthlyValue / datasets.length).toString());
        }

        let startValue = chartValues[startIndex];
        let finishValue = chartValues[finishIndex];

        drag = false;

        overlayRectangle.width = myChart.scales.x.getPixelForValue(finishIndex) - overlayRectangle.startX;

        overlayContext.clearRect(0, 0, overlay.width, overlay.height);

        overlayContext.fillStyle = "rgba(0, 0, 0, 0.5)";
        overlayContext.fillRect(overlayRectangle.startX * PR, myChart.chartArea.top * PR, overlayRectangle.width * PR, myChart.chartArea.bottom * PR - myChart.chartArea.top * PR);

        let valueDifference = parseFloat(finishValue) - parseFloat(startValue);

        overlayContext.fillStyle = valueDifference > 0 ? "rgba(0, 255, 0, 1)" : "rgba(255, 0, 0, 1)";
        overlayContext.fontWeight = "bold";
        overlayContext.font = `${32 * PR}px Open Sans`;

        let textWidth = overlayContext.measureText(FormatValueString(valueDifference)).width;
        let textHeight = overlayContext.measureText(FormatValueString(valueDifference)).actualBoundingBoxAscent;

        overlayContext.fillText(`${FormatValueString(valueDifference)}`, overlayRectangle.startX * PR + (overlayRectangle.width / 2) * PR - (textWidth / 2), myChart.chartArea.top * PR + (myChart.chartArea.bottom * PR - myChart.chartArea.top * PR) / 2 + (textHeight * PR / 2));

        if (overlayRectangle.width == 0) {
            overlayContext.clearRect(0, 0, overlay.width, overlay.height);
        }
    } else {
        drag = false;
        overlayContext.clearRect(0, 0, overlay.width, overlay.height);
    }
});

window.onbeforeunload = function () {
    let checkedBottleIDs = null;
    if (sortFilter == SortFilters.bottles) {
        checkedBottleIDs = checkedCellarItems.map(item => item.bottleID);
    } else {
        checkedBottleIDs = checkedCellarItems;
    }
    sessionStorage.setItem("checkedBottleIDs", JSON.stringify(checkedBottleIDs));
}