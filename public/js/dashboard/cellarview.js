/**
 * 
 * @param {*} priceHistory 
 * @returns 
 */
function formatCellarPriceHistory(priceHistory) {
    let formattedPriceHistory = {};
    let keys = Object.keys(priceHistory);

    for (var i = 0; i < keys.length; i++) {
        formattedPriceHistory[keys[i]] = priceHistory[keys[i]][0];
    }

    return formattedPriceHistory;

}

/**
 * Create the stats table for the cellar
 */
async function CreateStatsTableCellar() {

    let tableElement = document.getElementById("BottleStatsTable");

    let tableHTML = `<tr>
      <th>--</th>
      <th>Total Investment</th>
      <th>Total Cellar Value</th>
      <th>Profit/Loss</th>
    </tr>`;

    let totalPurchasePrice = 0;
    let totalLatestPrice = 0;
    let count = 0;

    for (let ii = 0; ii < cellarListItems.length; ii++) {
        // Distillery match
        let latestPrice = GetLatestBottlePrice(cellarListItems[ii].priceHistory);
        count++;
        totalPurchasePrice += cellarListItems[ii].purchasePrice;
        totalLatestPrice += latestPrice[1];
    }

    let avgPurchasePrice = (totalPurchasePrice).toFixed(2);
    let avgLatestPrice = (totalLatestPrice).toFixed(2);

    let profit = totalLatestPrice - totalPurchasePrice;

    let returnPercentage = ((profit / avgPurchasePrice) * 100).toFixed(2);

    tableHTML += `
      <tr>
        <td>Cellar</td>
        <td>£${totalPurchasePrice.toLocaleString()}</td>
        <td>£${totalLatestPrice.toLocaleString()}</td>
        ${profit > 0 ?
            `<td class="profit-green">£${profit.toLocaleString()} (&nbsp;+${returnPercentage}%&nbsp;)</td>`
            : `<td class="profit-red">£${profit.toLocaleString()} (&nbsp;${returnPercentage}%&nbsp;)</td>`}
      </tr>`;

    tableElement.innerHTML = tableHTML;
}

function DrawCellarChart() {

    // Show the price history canvas
    document.getElementById("NoBottlesMessage").style.display = "none";
    document.getElementById("CellarStatsContainer").style.display = "flex";
    let datasets = [];
  
    getAverageValueByMonthYear(cellarContent).then(totalPriceHistory => {
  
      let timeScaleAxis = sortMonthYears(Object.keys(totalPriceHistory));
      let monthValueAxis = [];

      if ( cutOffDate != null ){
        timeScaleAxis = timeScaleAxis.filter((monthYear) => 
          CheckIfMonthYearIsAfter(monthYear, cutOffDate)
        );
      }

      for (let i = 0; i < timeScaleAxis.length; i++) {
        monthValueAxis.push(totalPriceHistory[timeScaleAxis[i]]);
      }

      let lineColor = monthValueAxis[monthValueAxis.length - 1] > monthValueAxis[0] ? '#50C878' : '#D22B2B';
      
      let dashChart = document.getElementById("DashboardChart");
        let gradient = dashChart.getContext("2d").createLinearGradient(0, 0, 0, dashChart.clientHeight * 0.75);
        gradient.addColorStop(0, lineColor);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

      datasets.push({
        label: "Cellar",
        data: monthValueAxis,
        backgroundColor: gradient,
        fill: true,
        borderColor: lineColor,
        tension: 0.3
      });

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

      myChart.canvas.addEventListener("mousemove", (e) => {
        let rect = myChart.canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        mouseXPos = x;
      });

    });
  }


//export all of the functions from this file
/*export {
    formatCellarPriceHistory,
    buildCellarListHTML,
    CreateStatsTableCellar,
    DrawCellarChart
};*/