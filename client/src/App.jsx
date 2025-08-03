import React, { useEffect, useState } from "react";
import { LoadingScreen } from "./components/LoadingScreen";

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

function normalizeColors(colors) {
  if (!Array.isArray(colors) || colors.length === 0 || colors.includes("#N/A")) {
    return ["Colorless"];
  }
  return colors;
}

async function fetchScryfallPriceWithFallback(card, modifier) {
  const scryfallId = card.card?.uid;
	const archPrices = card.card?.prices || {};
  const mod = modifier.toLowerCase();

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
	const [selectedCategory, setSelectedCategory] = useState("All");
	const [selectedColor, setSelectedColor] = useState("All");



  useEffect(() => {
		async function loadCards() {
			try {
				const res = await fetch(`${API_BASE}/api/cards`);
				const data = await res.json();

				const cardsWithPrices = await Promise.all(
					data.map(async (card) => {
						const modifier = card.modifier || "";
						const { price, source } = await fetchScryfallPriceWithFallback(card, modifier);
						return { ...card, scryfallPrice: price, priceSource: source };
					})
				);

				setCards(cardsWithPrices);
			} catch (error) {
				console.error("Failed to fetch cards:", error);
			} finally {
				setLoading(false); // ✅ Only show data once all prices fetched
			}
		}

		loadCards();
	}, []);


	// Define filteredCards here inside the component function, before return
	const filteredCards = cards.filter((cardEntry) => {
		const currentCategory = cardEntry.categories?.[0] || "Uncategorized";
		const colors = normalizeColors(cardEntry.card?.oracleCard?.colors);
		const priceUSD = cardEntry.scryfallPrice;
		const expectedCategory = getCategoryByPrice(priceUSD);

		const matchesMismatch = !showOnlyMismatches || currentCategory !== expectedCategory;
		const matchesCategory = selectedCategory === "All" || currentCategory === selectedCategory;
		const matchesColor = selectedColor === "All" || colors.includes(selectedColor);

		return matchesMismatch && matchesCategory && matchesColor;
	})
	.sort((a, b) => {
		const nameA = a.card?.oracleCard?.name?.toLowerCase() || "";
		const nameB = b.card?.oracleCard?.name?.toLowerCase() || "";
		return nameA.localeCompare(nameB);
	});

	const allCategories = ["All", ...Array.from(new Set(cards.flatMap(c => c.categories || ["Uncategorized"]))).sort()];
	
	function normalizeColors(colors) {
		if (!Array.isArray(colors) || colors.length === 0 || colors.includes("#N/A")) {
			return ["Colorless"];
		}
		return colors;
	}

	const allColors = ["All", ...Array.from(new Set(
		cards.flatMap(c => normalizeColors(c.card?.oracleCard?.colors))
	)).sort()];


  if (loading) {
  	return <LoadingScreen onComplete={() => setLoading(false)} />;
	}

  return (
    <div style={{ padding: "20px" }}>
      <h1>MTG Deck Cards</h1>
			<label style={{ display: "block", marginBottom: "10px", width: "fit-content"}}>
				<input
					type="checkbox"
					checked={showOnlyMismatches}
					onChange={(e) => setShowOnlyMismatches(e.target.checked)}
				/>
				{" "}Show Only Mismatched Cards
			</label>
			<div style={{ marginBottom: "10px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
				<label>
					Filter by Category:
					<select style={{ marginLeft: "5px" }} value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
						{allCategories.map((cat) => (
							<option key={cat} value={cat}>{cat}</option>
						))}
					</select>
				</label>
				<label>
					Filter by Color:
					<select style={{ marginLeft: "5px" }} value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
						{allColors.map((color) => (
							<option key={color} value={color}>{color}</option>
						))}
					</select>
				</label>
			</div>
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
								<td>{normalizeColors(oracleCard.colors).join(", ")}</td>
								<td>{capitalize(cardEntry.card?.rarity) || "Unknown"}</td>
                <td>{cardEntry.modifier}</td>
								<td>{cardEntry.categories?.join(", ")}</td>
								<td>{shouldBeCategory}</td>
								<td style={{ color: cardEntry.priceSource.includes("Scryfall") ? "green" : "blue" }}>${priceUSD != null ? `${priceUSD.toFixed(2)}` : "Unknown"}</td>
							</tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
