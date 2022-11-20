/**
 * Retrieves the number of bottles in the user's cellar
 * @param {number} bottleID The ID of the bottle to check for 
 * @returns Quantity of the bottle in the user's cellar
 */
function retrieveBottleQuantity(bottleID) {
    quantity = 0;
    for (var i = 0; i < cellarListItems.length; i++) {
        if (cellarListItems[i].bottleID == bottleID) {
            quantity++;
        }
    }

    return quantity;
}

/**
 * Switches the chart to display repeated bottles either individually or grouped
 */
function switchGroupStatus() {
    sessionStorage.setItem("checkedBottleIDs", null);
    // Switch the group status
    groupBottles = !groupBottles;
    document.getElementById("groupButton").innerText = groupBottles ? "Showing Bottles: Grouped" : "Showing Bottles: Individually";

    // Uncheck all of the currently checked bottles before we switch

    let listItems = document.getElementsByClassName("cellar-list-item");
    let checkAllButton = document.getElementById("checkAllButton");

    for (var i = 0; i < listItems.length; i++) {
        onCellarListPress(listItems[i].id, false);
    }

    checkAllButton.innerText = "Check All";
    numberChecked = 0;

    // Rebuild the chart
    buildCellarListHTML();
}

/**
 * Inserts null values into the price history array to fill in gaps
 * and make it stretch to the full time scale
 * @param {*} bottlePriceHistory The price history of the bottle
 * @param {*} timeScaleAxis The time scale axis to fill in
 * @returns The formatted price history
 */
function createFormattedBottlePriceHistory(bottlePriceHistory, timeScaleAxis) {
    let formattedPriceHistory = {};
    for (var i = 0; i < timeScaleAxis.length; i++) {
        formattedPriceHistory[timeScaleAxis[i]] = bottlePriceHistory[timeScaleAxis[i]] == undefined ? null : bottlePriceHistory[timeScaleAxis[i]];
    }

    return formattedPriceHistory;
}

/**
 * Creates the stats table under the chart which shows
 * information about the bottles in the cellar which have
 * been selected
 */
async function CreateStatsTableBottle() {
    
    let tableElement = document.getElementById("BottleStatsTable");

    let tableHTML = `<tr>
      <th>Bottle</th>
      <th>Purchased For</th>
      <th>Latest Price</th>
      <th>Profit/Loss</th>
      <th>Most Profitable Auction House (&nbsp;Avg&nbsp;)</th>
    </tr>`;

    for (let i = 0; i < checkedCellarItems.length; i++) {
        let currentItem = checkedCellarItems[i];
        let latestPrice = GetLatestBottlePrice(currentItem.priceHistory);
        let profit = parseFloat(latestPrice[1]) - parseFloat(currentItem.purchasePrice);
        let returnPercentage = (profit / parseFloat(currentItem.purchasePrice)) * 100;


        if ( currentItem.purchasePrice > 0 ){
            tableHTML += `
            <tr>
                <td>${currentItem.pageTitle}</td>
                <td>£${currentItem.purchasePrice} on ${currentItem.purchaseDate.split("T")[0]}</td>
                <td>£${latestPrice[1]} on ${latestPrice[0]}</td>
                ${profit > 0 ?
                        `<td class="profit-green">£${profit.toLocaleString("en-GB")} (&nbsp;+${returnPercentage.toFixed(2)}%&nbsp;)</td>`
                        : `<td class="profit-red">-£${(profit * -1).toLocaleString("en-GB")} (&nbsp;${returnPercentage.toFixed(2)}%&nbsp;)</td>`}
                <td><a href="${currentItem.mostProfitableAuctionHouse}">${currentItem.mostProfitableAuctionHouse}</a></td>
            </tr>
            `
        } else {
            tableHTML += `
            <tr>
                <td>${currentItem.pageTitle}</td>
                <td>£${currentItem.purchasePrice} on ${currentItem.purchaseDate.split("T")[0]}</td>
                <td>£${latestPrice[1]} on ${latestPrice[0]}</td>
                ${profit > 0 ?
                    `<td class="profit-green">£${profit.toLocaleString("en-GB")}</td>`
                    : `<td class="profit-red">-£${(profit * -1).toLocaleString("en-GB")}</td>`}
                <td><a href="${currentItem.mostProfitableAuctionHouse}">${currentItem.mostProfitableAuctionHouse}</a></td>
            </tr>
            `
        }
    }

    tableElement.innerHTML = tableHTML;
}

/**
 * Draws the chart for the bottles in the cellar
 * @param {*} timeScaleAxis The time scale axis to use
 */
function DrawBottleChart(timeScaleAxis) {

    if (checkedCellarItems.length == 0) {
        // No Bottles Have Been Selected
        document.getElementById("NoBottlesMessage").style.display = "flex";
        document.getElementById("CellarStatsContainer").style.display = "none";
    } else {
        document.getElementById("NoBottlesMessage").style.display = "none";
        document.getElementById("CellarStatsContainer").style.display = "flex";
        var datasets = [];

        for (var i = 0; i < checkedCellarItems.length; i++) {
            let bottle = checkedCellarItems[i];
            let priceValues = Object.values(createFormattedBottlePriceHistory(bottle.priceHistory, timeScaleAxis)).map(e => (e));
            
            let firstValue = -1;
            let lastValue = -1;
            for ( let j = 0; j < priceValues.length; j++ ){
                if ( firstValue == -1 && priceValues[j] != null ){
                    firstValue = parseFloat(priceValues[j]);
                }

                if ( priceValues[j] != null ){
                    lastValue = parseFloat(priceValues[j]);
                }
            }

            let lineColor = lastValue - firstValue > 0 ? '#50C878' : '#D22B2B';

            let bottleQuantity = retrieveBottleQuantity(bottle.bottleID);
            let bottleData = groupBottles ? Object.values(createFormattedBottlePriceHistory(bottle.priceHistory, timeScaleAxis)).map(e => (e == null ? null : (e * bottleQuantity))) :
                priceValues;

            let dashChart = document.getElementById("DashboardChart");
            let gradient = dashChart.getContext("2d").createLinearGradient(0, 0, 0, dashChart.clientHeight * 0.75);
            gradient.addColorStop(0, lineColor);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            datasets.push({
                label: bottle.distillery + " " + bottle.age + " Year Old " + bottle.bottledStrength + "%" + " " + bottle.bottleSize,
                data: bottleData,
                fill: false,
                borderColor: lineColor,
                backgroundColor: gradient,
                fill: true,
                tension: 0.3
            });
        }

        const labels = timeScaleAxis;
        const data = {
            labels: labels,
            datasets: datasets,
        };

        const config = {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                spanGaps: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false,
                        intersect: false,
                        mode: 'index',
                        callbacks: {
                            label: function (context) {
                                let label = context.dataset.label || '';

                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            // Include a dollar sign in the ticks
                            callback: function (value, index, ticks) {
                                return '£' + value;
                            }
                        }
                    }
                },
                /*segment: {
                    //borderColor: (ctx) => (ctx.p0.parsed.y < ctx.p1.parsed.y ? '#50C878' : '#D22B2B')
                    borderColor: (ctx) => {
                        if (ctx.p1.parsed.y > ctx.p0.parsed.y) {
                            return '#50C878';
                        } else if (ctx.p1.parsed.y < ctx.p0.parsed.y) {
                            return '#D22B2B';
                        } else {
                            return '#000000';
                        }

                    }
                },*/
            },
            plugins: [{
                beforeDraw: verticalHover,
            }]
        };

        if (myChart != null) {
            myChart.destroy();
        }

        myChart = new Chart(document.getElementById("DashboardChart"), config);
    }
}

//export all functions from this file
/*export {
    retrieveBottleQuantity,
    switchGroupStatus,
    createFormattedBottlePriceHistory,
    CreateStatsTableBottle,
    DrawBottleChart
}*/