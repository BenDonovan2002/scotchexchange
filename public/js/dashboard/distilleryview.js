function getPriceHistoryByDistillery() {
    let distillery_history = {};
    let bottles = getDistilleryBottles(checkedCellarItems);

    for (var i = 0; i < bottles.length; i++) {
        if (distillery_history[bottles[i].distillery] == undefined) {
            distillery_history[bottles[i].distillery] = {};
        }

        let currentPriceHistoryKeys = Object.keys(bottles[i].priceHistory);

        for (var ii = 0; ii < currentPriceHistoryKeys.length; ii++) {
            if (distillery_history[bottles[i].distillery][currentPriceHistoryKeys[ii]] == undefined) {
                distillery_history[bottles[i].distillery][currentPriceHistoryKeys[ii]] = [bottles[i].priceHistory[currentPriceHistoryKeys[ii]]];
            } else {
                distillery_history[bottles[i].distillery][currentPriceHistoryKeys[ii]].push(bottles[i].priceHistory[currentPriceHistoryKeys[ii]]);
            }
        }
    }

    return distillery_history;
}

function getDistilleryBottles(distilleries) {
    let bottles = [];
    for (var i = 0; i < cellarListItems.length; i++) {
        if (distilleries.includes(cellarListItems[i].distillery)) {
            bottles.push(cellarListItems[i]);
        }
    }

    return bottles;
}

function createFormattedDistilleryPriceHistory(distilleryPriceHistory, timeScaleAxis) {

    let formattedPriceHistory = {};

    for (var i = 0; i < timeScaleAxis.length; i++) {

        if (distilleryPriceHistory[timeScaleAxis[i]] == undefined) {
            formattedPriceHistory[timeScaleAxis[i]] = null;
        } else {
            formattedPriceHistory[timeScaleAxis[i]] = distilleryPriceHistory[timeScaleAxis[i]][0];
        }
    }

    return formattedPriceHistory;


}

function buildDistilleryListItemHTML(index, distillery) {
    if (distillery == null || distillery == undefined) {
        return "";
    }
    return `
      <li id="cellarList_${index}" ind="${index}" class="cellar-list-item col-12 d-flex justify-content-between" >
        <div>
          <h1>${distillery}</h1>
        </div>
        <input id=cellarList_${index}_Checkbox type="checkbox"; ></input>
      </li>
    `;
}

async function CreateStatsTableDistillery() {

    let cellarInvestment = GetTotalCellarInvestment();
    let cellarValue = GetTotalCellarValue();

    let tableElement = document.getElementById("BottleStatsTable");

    let tableHTML = `<tr>
      <th>Bottle</th>
      <th>Total Investment</th>
      <th>% Share Of Cellar Investment</th>
      <th>Total Latest Value</th>
      <th>% Share Of Cellar Value</th>
      <th>Profit/Loss</th>
    </tr>`;

    for (let i = 0; i < checkedCellarItems.length; i++) {
        let currentItem = checkedCellarItems[i];
        let totalPurchasePrice = 0;
        let totalLatestPrice = 0;
        let count = 0;

        for (let ii = 0; ii < cellarListItems.length; ii++) {
            if (cellarListItems[ii].distillery == currentItem) {
                // Distillery match
                let latestPrice = GetLatestBottlePrice(cellarListItems[ii].priceHistory);
                count++;
                totalPurchasePrice += cellarListItems[ii].purchasePrice;
                totalLatestPrice += latestPrice[1];
            }
        }

        let avgPurchasePrice = totalPurchasePrice / count;
        let avgLatestPrice = totalLatestPrice / count;

        let profit = totalLatestPrice - totalPurchasePrice;

        let returnPercentage = (profit / totalPurchasePrice) * 100;

        let shareOfInvestment = (totalPurchasePrice / cellarInvestment) * 100;
        let shareOfValue = (totalLatestPrice / cellarValue) * 100;

        tableHTML += `
      <tr>
        <td>${currentItem}</td>
        <td>£${totalPurchasePrice.toLocaleString()}</td>
        <td>${shareOfInvestment.toFixed(2)}%</td>
        <td>£${totalLatestPrice.toLocaleString()}</td>
        <td class=${shareOfValue >= shareOfInvestment ? "profit-green" : "profit-red"}>${shareOfValue.toFixed(2)}%</td>
        ${profit > 0 ?
                `<td class="profit-green">£${profit.toLocaleString()} (&nbsp;+${returnPercentage.toFixed(2)}%&nbsp;)</td>`
                : `<td class="profit-red">£${profit.toLocaleString()} (&nbsp;${returnPercentage.toFixed(2)}%&nbsp;)</td>`}
      </tr>`;
    }

    tableElement.innerHTML = tableHTML;
}

function DrawDistilleryChart(timeScaleAxis, distilleryHistoryObject) {

    if (checkedCellarItems.length == 0) {
        // No Bottles Have Been Selected
        document.getElementById("NoBottlesMessage").style.display = "flex";
        document.getElementById("CellarStatsContainer").style.display = "none";
    } else {
        document.getElementById("NoBottlesMessage").style.display = "none";
        document.getElementById("CellarStatsContainer").style.display = "flex";
        var datasets = [];

        let distilleryKeys = Object.keys(distilleryHistoryObject);

        for (var i = 0; i < distilleryKeys.length; i++) {
            let distillery = distilleryHistoryObject[distilleryKeys[i]];
            let priceValues = Object.values(createFormattedDistilleryPriceHistory(distillery, timeScaleAxis));
            
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

            let dashChart = document.getElementById("DashboardChart");
            let gradient = dashChart.getContext("2d").createLinearGradient(0, 0, 0, dashChart.clientHeight * 0.75);
            gradient.addColorStop(0, lineColor);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            datasets.push({
                label: distilleryKeys[i],
                data: Object.values(createFormattedDistilleryPriceHistory(distillery, timeScaleAxis)),
                fill: false,
                borderColor: lineColor,
                backgroundColor: gradient,
                fill: true,
                tension: 0.3
            });
        }

        /** @type CellarListItem */

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
                }
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

/*export {
    getPriceHistoryByDistillery,
    getDistilleryBottles,
    createFormattedDistilleryPriceHistory,
    buildDistilleryListItemHTML,
    CreateStatsTableDistillery,
    DrawDistilleryChart,
};*/