/**
 * Script for the bottle page
 */

// Get the ID for the bottle so we can grab it from the DB
const bottle_id = document.getElementById("bottle_id_div").getAttribute("bottle_id");
var myChart = null;

var mouseXPos = 0;

let resetChart;

let cutOffDate = null;

function TimeFrameButtonPressed(timeFrame) {
    location.href = `/bottle/${bottle_id}/${timeFrame}`;
}

function GetTimeFrame(timeFrame) {
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

addEventListener('load', () => {
    let clientWidth = document.getElementById("DashboardChart").clientWidth;
    let clientHeight = document.getElementById("DashboardChart").clientHeight;

    document.getElementById("DashboardChart").setAttribute("width", clientWidth);
    document.getElementById("DashboardChart").setAttribute("height", clientHeight);
})

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
 * Create a form for each bottle that can be added to the cellar specifying purchase price
 * and date
 */
function CreateBottleAddForms() {
    let bottleQuantity = parseInt(document.getElementById("bottle_quantity").value);

    let formHTML = ``;

    for (let i = 0; i < bottleQuantity; i++) {
        formHTML += `
        <div class="input-group" style="margin-top: 40px; margin-bottom: 20px; height: 50px;">
                        <a style="background-color: #B74601; border-color: #B74601; color: white;" class="col-1 input-group-text">£</a>
                        <input class="form-control purchase_price" type="text"
                            placeholder="Purchase Price" step="0.01" value="" />
                    </div>

        <input style="height: 50px; margin-top: 20px;" class="form-control purchase_date" type="date"
                            placeholder="Date Purchased" value="" /> 
                `;
    }

    document.getElementById("bottle-add-forms").innerHTML = formHTML;
}

/**
 * Change the quantity specified in the purchased quantity input field.
 * @param {number} The amount to change the quantity by 
 */
function ChangeBottleAmount(inc) {
    if (isNaN(document.getElementById("bottle_quantity").value)
        || document.getElementById("bottle_quantity").value.length == 0) {
        document.getElementById("bottle_quantity").value = 1;
    } else {
        if (inc < 0) {
            if (parseInt(document.getElementById("bottle_quantity").value) > 0) {
                document.getElementById("bottle_quantity").value = parseInt(document.getElementById("bottle_quantity").value) + inc;
            }
        } else {
            document.getElementById("bottle_quantity").value = parseInt(document.getElementById("bottle_quantity").value) + inc;
        }
    }

    CreateBottleAddForms();
}

/**
 * Check to see if a string is numeric
 */
function isNumeric(str, extra) {
    let allowedChars = "0123456789" + extra;
    let numeric = true;

    for (var i = 0; i < str.length; i++) {
        if (!allowedChars.includes(str[i])) {
            numeric = false;
        }
    }

    return numeric;
}

function OrderByDate(monthYears) {
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

function GetPriceHistoryInTimeFrame(priceHistory) {
    if (cutOffDate == null) {
        return priceHistory;
    } else {
        return TruncatePriceHistoryToAfterMonthYear(priceHistory, cutOffDate);
    }
}

/**
 * Set up the chart showing the bottle's price history
 */
function DrawChart() {

    /**
     * Get the bottle info from the get_attribute API route. The response is an array
     * of JSON objects in the format:
     * [ { bottle distillery, bottle age, bottle strength, bottle voulme },
     * { month: average_price, month: average_price, month: average_price... } ]
     */

    fetch(`/api/v1/get_aggregate/${bottle_id}`).then(r => {
        r.json().then(j => {
            console.log(j[1]);
            let monthValueAxis = Object.values(GetPriceHistoryInTimeFrame(j[1])).map(e => (e));

            let lineColor = monthValueAxis[monthValueAxis.length - 1] > monthValueAxis[0] ? '#50C878' : '#D22B2B';

            let dashChart = document.getElementById("DashboardChart");
            let gradient = dashChart.getContext("2d").createLinearGradient(0, 0, 0, dashChart.clientHeight * 0.75);
            gradient.addColorStop(0, lineColor);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            const labels = OrderByDate(Object.keys(GetPriceHistoryInTimeFrame(j[1])));
            const data = {
                labels: labels,
                datasets: [{
                    label: document.getElementById("HeadingElement").innerText,
                    data: monthValueAxis,
                    backgroundColor: gradient,
                    fill: true,
                    borderColor: lineColor,
                    //borderColor: '#B74601',
                    tension: 0.1
                }]
            };

            const config = {
                type: 'line',
                data: data,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
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

            /**
             * @type {Chart}
             */
            myChart = new Chart(document.getElementById("DashboardChart"), config);

            // Add a listener to the canvas element to detect when the mouse is hovering over it
            // and log the mouse position to the console
            myChart.canvas.addEventListener("mousemove", (e) => {
                let rect = myChart.canvas.getBoundingClientRect();
                let x = e.clientX - rect.left;
                mouseXPos = x;

            });
        });
    });
}

/**
 * Contacts the REST API letting the server know to add this bottle to the
 * user's cellar
 */
function AddBottleToCellar() {
    let bottlePriceElements = document.getElementsByClassName("purchase_price");
    let bottleDateElements = document.getElementsByClassName("purchase_date");

    let userBottles = [];

    if (bottlePriceElements.length == bottleDateElements.length) {
        // Loop through the bottle price and date elements and add them to the userBottles array

        for (let i = 0; i < bottlePriceElements.length; i++) {
            let bottlePrice = bottlePriceElements[i].value;
            let bottleDate = bottleDateElements[i].value;

            if (bottlePrice.length > 0 && bottleDate.length > 0) {
                userBottles.push({
                    purchase_price: bottlePrice,
                    purchase_date: bottleDate
                });
            }
        }
    }

    fetch(`/api/v1/add_to_cellar/${bottle_id}/${JSON.stringify(userBottles)}`).then((r) => {
        r.json().then(j => {
            if (j) {
                document.getElementById("messageboxtext").innerText = "Successfully Added Bottle To Cellar!";
                document.getElementById("messagebox").style.display = "flex";
            } else {
                document.getElementById("messageboxtext").innerText = "Couldn't Add Bottle To Cellar!";
                document.getElementById("messagebox").style.display = "flex";
            }
        })

    });
}

/*let canvas = document.getElementById("DashboardChart");
let overlay = document.getElementById("OverlayChart");

let overlayContext = overlay.getContext("2d");

let startIndex = 0;

let overlayRectangle = {
    startX: 0,
    startY: 0,
    width: 0,
}

let drag = false;

canvas.addEventListener( "mousedown", e => {
    let points = myChart.getElementsAtEventForMode(e, 'index', { intersect: false } );

    startIndex = points[0].index;

    // get the x position of startIndex on the canvas and store it in a variable


    let rect = canvas.getBoundingClientRect();
    let x = myChart.scales.x.getPixelForValue( startIndex );
    let y = e.clientY - rect.top;

    overlayRectangle.startX = x;
    overlayRectangle.startY = y;

    drag = true;

} );

canvas.addEventListener( "mousemove", e => {
    let rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    if ( drag ) {
        overlayRectangle.width = x - overlayRectangle.startX;
        overlayContext.clearRect(0, 0, overlay.width, overlay.height);
        overlayContext.fillStyle = "rgba(0, 0, 0, 0.5)";
        overlayContext.fillRect(overlayRectangle.startX, myChart.chartArea.top, overlayRectangle.width, myChart.chartArea.bottom - myChart.chartArea.top);
    } else {
        overlayContext.clearRect(0, 0, overlay.width, overlay.height);
    }

} );

canvas.addEventListener( "mouseup", e => {
    overlayContext.clearRect(0, 0, overlay.width, overlay.height);

    let points = myChart.getElementsAtEventForMode(e, 'index', {
        intersect: false
    });

    let finishIndex = points[0].index;

    let chartValues = myChart.config.data.datasets[0].data;

    let startValue = chartValues[startIndex];
    let finishValue = chartValues[finishIndex];

    console.log( parseFloat(finishValue) - parseFloat(startValue) );

    drag = false;
} );*/

GetTimeFrame(document.getElementById("time_frame").getAttribute("timeFrame").replace(/[^a-zA-Z0-9]/g, ''));


DrawChart();
CreateBottleAddForms();