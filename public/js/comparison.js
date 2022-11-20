function GetLowestSalePrice(saleInfo) {
    let cheapestAuctionHouse = null;

    let auctionHouses = Object.keys(saleInfo);

    for (let i = 0; i < auctionHouses.length; i++) {
        let auctionHouse = auctionHouses[i];

        if (cheapestAuctionHouse == null || parseFloat(saleInfo[auctionHouse]) < parseFloat(saleInfo[cheapestAuctionHouse])) {
            cheapestAuctionHouse = auctionHouse;
        }
    }

    return cheapestAuctionHouse;
}

function GetDifferenceFromCheapestAuctionHouse(currentAuctionHouse, cheapestAuctionHouse) {
    return parseFloat(currentAuctionHouse) - parseFloat(cheapestAuctionHouse);
}

function GetCheapestDifferenceFromNextBest(saleInfo) {
    let cheapestAuctionHouse = GetLowestSalePrice(saleInfo);

    let saleInfoCopy = JSON.parse(JSON.stringify(saleInfo));
    delete saleInfoCopy[cheapestAuctionHouse];

    let nextBestAuctionHouse = GetLowestSalePrice(saleInfoCopy);

    return parseFloat(saleInfo[nextBestAuctionHouse]) - parseFloat(saleInfo[cheapestAuctionHouse]);
}

function UpdateRecommendation(saleInfo) {
    // TODO
    if (  Object.keys( saleInfo ).length == 1 ){
        document.getElementById("purchase-text").innerHTML = "We only have one seller on file for this bottle. We recommend you purchase it from them.";
    } else {
        let cheapestAuctionHouse = GetLowestSalePrice(saleInfo);
        let differenceFromNextBest = GetCheapestDifferenceFromNextBest(saleInfo);
    
        let recommendationText = document.getElementById("purchase-text");
    
        recommendationText.innerHTML = recommendationText.innerHTML
            .replace("{AUCTION_HOUSE}", `<a href=" ${cheapestAuctionHouse} ">${cheapestAuctionHouse}</a>`)
            .replace("{PRICE_COMPARISON}", `£${differenceFromNextBest.toLocaleString()}`);
    }

}

/**
 * Populates the comparison table with the information about the
 * sale price of the bottle in different auction houses
 */
function PopulateComparisonTable() {

    let saleInfo = JSON.parse(document.getElementById("sale-info").getAttribute("dat"));
    //let bottleInfo = JSON.parse( document.getElementById("sale-info").getAttribute("bottleInfo") );

    let cheapestAuctionHouse = GetLowestSalePrice(saleInfo);

    let table = document.getElementById("comparison-table");
    let whiskeyHouses = Object.keys(saleInfo);

    UpdateRecommendation(saleInfo);

    tableHTML = ``;

    if (whiskeyHouses.length == 1) {
        tableHTML += `<tr>
        <td class="$cheapest"><a href="${whiskeyHouses[0]}">${whiskeyHouses[0]}</a></td>
        <td class="cheapest">£${ parseFloat( saleInfo[whiskeyHouses[0]] ).toLocaleString() }</td>
        <td class="cheapest">--</td>
    </tr>`;
    } else {
        for (let i = 0; i < whiskeyHouses.length; i++) {
            let whiskeyHouse = whiskeyHouses[i];
            let priceDifference = GetDifferenceFromCheapestAuctionHouse(
                saleInfo[whiskeyHouse],
                saleInfo[cheapestAuctionHouse]
            );

            let rowClass = whiskeyHouse == cheapestAuctionHouse ? "cheapest" : "not-cheapest";

            tableHTML += `<tr>
                        <td class="${rowClass}"><a href="${whiskeyHouse}">${whiskeyHouse}</a></td>
                        <td class="${rowClass}">£${ parseFloat( saleInfo[whiskeyHouse] ).toLocaleString() }</td>
                        ${priceDifference > 0
                    ? `<td class="${rowClass}">£${priceDifference.toLocaleString()} (&nbsp;${((priceDifference / parseFloat(saleInfo[cheapestAuctionHouse])) * 100).toFixed(2)}%&nbsp;)</td>`
                    : `<td class="${rowClass}">£${priceDifference}</td>`}
                    </tr>`;
        }
    }

    table.innerHTML += tableHTML;
}

window.onload = () => {
    PopulateComparisonTable();
};