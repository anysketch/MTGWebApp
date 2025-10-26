import React, { useEffect, useState } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

function normalizeColors(colors) {
  if (!Array.isArray(colors) || colors.length === 0 || colors.includes("#N/A")) {
    return ["Colorless"];
  }
  return colors;
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

function fetchArchidektPrice(card, modifier) {
  const prices = card.card?.prices || {};
  const mod = modifier?.toLowerCase() || "";

  const isFoil = mod.includes("foil") || mod.includes("etched");

  if (isFoil) {
    if (prices.tcgfoil != 0) {
      return { price: parseFloat(prices.tcgfoil), source: "TCGPlayer (foil)" };
    }
    if (prices.ckfoil != 0) {
      return { price: parseFloat(prices.ckfoil), source: "Card Kingdom (foil fallback)" };
    }
  } else {
    if (prices.tcg != 0) {
      return { price: parseFloat(prices.tcg), source: "TCGPlayer (normal)" };
    }
    if (prices.ck != 0) {
      return { price: parseFloat(prices.ck), source: "Card Kingdom (normal fallback)" };
    }
  }

  return { price: 0, source: "No price available" };
}


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
						const { price, source } = fetchArchidektPrice(card, modifier);
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

	const allColors = ["All", ...Array.from(new Set(
		cards.flatMap(c => normalizeColors(c.card?.oracleCard?.colors))
	)).sort()];


  if (loading) {
  	return <LoadingScreen onComplete={() => setLoading(false)} />;
	}

  return (
    <div style={{ padding: "20px" }}>
      <h1>MTG Deck Cards</h1>          // Title of the page
			<button onClick="location.reload();">Refresh Page</button>
			<label style={{ display: "block", marginBottom: "10px", width: "fit-content", cursor: "pointer" }}>
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
      <div className="table-container">
				<table className="centered-table">
					<thead>
						<tr>
							{["Quantity", "Name", "Edition", "Collector #", "Color(s)", "Rarity", "Modifier", "Current Category", "Should Be In", "Price (USD)"].map(header => (
								<th key={header}>{header}</th>
							))}
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
									<td>
										{oracleCard.name && card.uid ? (
											<a
												href={`https://archidekt.com/card?name=${encodeURIComponent(oracleCard.name)}&uid=${card.uid}`}
												target="_blank"
												rel="noopener noreferrer"
												style={{ color: "black", textDecoration: "underline", cursor: "pointer" }}
											>
												{oracleCard.name}
											</a>
										) : (
											oracleCard.name || "Unknown"
										)}
									</td>
									<td>{edition.editionname}</td>
									<td>{cardEntry.card?.collectorNumber}</td>
									<td>{normalizeColors(oracleCard.colors).join(", ")}</td>
									<td>{capitalize(cardEntry.card?.rarity) || "Unknown"}</td>
									<td>{cardEntry.modifier}</td>
									<td>{cardEntry.categories?.join(", ")}</td>
									<td>{shouldBeCategory}</td>
									<td style={{ color: cardEntry.priceSource.includes("TCG") ? "green" : "blue" }}>
										${priceUSD != null ? `${priceUSD.toFixed(2)}` : "Unknown"}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
    </div>
  );
}

export default App;
