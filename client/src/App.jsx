import React, { useEffect, useState } from "react";

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

async function fetchScryfallPriceWithFallback(card, modifier) {
  const scryfallId = card.card?.uid;
	const archPrices = card.card?.prices || {};
  const mod = modifier.toLowerCase();

	if (!scryfallId) {
    console.log("Missing Scryfall UID for card:", card.card?.name);
    return { price: null, source: "Missing Scryfall UID" };
  }

  try {
    const response = await fetch(`https://api.scryfall.com/cards/${scryfallId}`);
    const data = await response.json();
    const { usd, usd_foil, usd_etched } = data.prices;

    // Handle etched
    if (mod.includes("etched")) {
      if (usd_etched) return { price: parseFloat(usd_etched), source: "Scryfall (etched)" };
      if (archPrices.ckfoil) return { price: parseFloat(archPrices.ckfoil), source: "Card Kingdom (foil fallback)" };
      return { price: null, source: "No Etched Price" };
    }

    // Handle foil
    if (mod.includes("foil")) {
      if (usd_foil) return { price: parseFloat(usd_foil), source: "Scryfall (foil)" };
      if (archPrices.ckfoil) {
				console.log("Using Card Kingdom foil price as fallback for:", card.card.name);
				return { price: parseFloat(archPrices.ckfoil), source: "Card Kingdom (foil fallback)" };
			}
      return { price: null, source: "No Foil Price" };
    }

    // Handle normal
    if (usd) return { price: parseFloat(usd), source: "Scryfall (normal)" };
    if (archPrices.ck) return { price: parseFloat(archPrices.ck), source: "Card Kingdom (normal fallback)" };

    return { price: null, source: "No price at all" };
  } catch (err) {
    console.error("Failed to fetch Scryfall price:", err);
    return { price: null, source: "Error" };
  }
}




function getCategoryByPrice(price) {
  if (typeof price !== "number" || isNaN(price)) return "No price";
  if (price < 1.4) return "$1";
  if (price < 2.4) return "$2";
  if (price < 3.4) return "$3";
  if (price < 4.4) return "$4";
  if (price < 5.4) return "$5";
  return "+$5";
}

const API_BASE = import.meta.env.VITE_API_BASE || "";


function App() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
	const [showOnlyMismatches, setShowOnlyMismatches] = useState(false);


  useEffect(() => {
		fetch(`${API_BASE}/api/cards`)
			.then((res) => res.json())
			.then(async (data) => {
				const cardsWithPrices = [];

				for (const card of data) {
					const modifier = card.modifier || "";
					const { price, source } = await fetchScryfallPriceWithFallback(card, modifier);
					cardsWithPrices.push({ ...card, scryfallPrice: price, priceSource: source });

					// Optional: Small delay between requests to be nice to Scryfall
					await new Promise((r) => setTimeout(r, 150));
				}

				setCards(cardsWithPrices);
				setLoading(false);
			})
			.catch((error) => {
				console.error("Failed to fetch cards:", error);
				setLoading(false);
			});
	}, []);

	// Define filteredCards here inside the component function, before return
  const filteredCards = cards.filter((cardEntry) => {
    const currentCategory = cardEntry.categories?.[0] || "Uncategorized";
    const priceUSD = cardEntry.scryfallPrice;
    const expectedCategory = getCategoryByPrice(priceUSD);

    return !showOnlyMismatches || currentCategory !== expectedCategory;
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>MTG Deck Cards</h1>
			<label style={{ display: "block", marginBottom: "10px" }}>
				<input
					type="checkbox"
					checked={showOnlyMismatches}
					onChange={(e) => setShowOnlyMismatches(e.target.checked)}
				/>
				{" "}Show Only Mismatched Cards
			</label>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%", textAlign: "center" }}>
        <thead>
          <tr>
            <th>Quantity</th>
						<th>Name</th>
            <th>Edition</th>
            <th>Collector #</th>
						<th>Color(s)</th>
						<th>Rarity</th>
            <th>Modifier</th>
						<th>Current Category</th>
						<th>Should Be In</th>
            <th>Price (USD)</th>
          </tr>
        </thead>
        <tbody>
          {filteredCards.map((cardEntry) => {
						const card = cardEntry.card || {};
						const oracleCard = card.oracleCard || {};
						const edition = card.edition || {};
						const currentCategory = cardEntry.categories?.[0] || "Uncategorized";
						const priceUSD = cardEntry.scryfallPrice;
						const shouldBeCategory = getCategoryByPrice(priceUSD);

					const isMismatch = currentCategory !== shouldBeCategory;
					
            return (
              <tr
								key={cardEntry.id}
								style={{ backgroundColor: isMismatch ? "#ffe6e6" : "white", textAlign: "center" }}
							>
                <td>{cardEntry.quantity}</td>
								<td>{oracleCard.name || "Unknown"}</td>
                <td>{edition.editionname}</td>
                <td>{cardEntry.card?.collectorNumber}</td>
								<td>{oracleCard.colors?.join(", ") || "N/A"}</td>
								<td>{capitalize(cardEntry.card?.rarity) || "N/A"}</td>
                <td>{cardEntry.modifier}</td>
								<td>{cardEntry.categories?.join(", ")}</td>
								<td>{shouldBeCategory}</td>
								<td style={{ color: cardEntry.priceSource.includes("Scryfall") ? "green" : "blue" }}>${priceUSD != null ? `${priceUSD.toFixed(2)}` : "N/A"}</td>
							</tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
