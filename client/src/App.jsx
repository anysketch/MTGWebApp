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

const categoryRank = {
  "$1": 1,
  "$2": 2,
  "$3": 3,
  "$4": 4,
  "$5": 5,
  "+$5": 6,
  "No price": 0
};


function fetchArchidektPrice(card, modifier) {
  const prices = card.card?.prices || {};
  const mod = modifier?.toLowerCase() || "";

  const isFoil = mod.includes("foil") || mod.includes("etched");

  if (isFoil) {   // Check foil prices first
    if (prices.tcgfoil != 0) {     // TCGPlayer foil price available
      return { price: parseFloat(prices.tcgfoil), source: "TCGPlayer (foil)" };
    }
    if (prices.ckfoil != 0) {      // Card Kingdom foil price fallback
      return { price: parseFloat(prices.ckfoil), source: "Card Kingdom (foil fallback)" };
    }
  } else {        // Normal (non-foil) prices
    if (prices.tcg != 0) {
      return { price: parseFloat(prices.tcg), source: "TCGPlayer (normal)" };
    }
    if (prices.ck != 0) {
      return { price: parseFloat(prices.ck), source: "Card Kingdom (normal fallback)" };
    }
  }

  return { price: 0, source: "No price available" };
}

// Main App Component
function App() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
	const [showOnlyMismatches, setShowOnlyMismatches] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState("All");
	const [selectedColor, setSelectedColor] = useState("All");
	const [selectedShouldBe, setSelectedShouldBe] = useState("All");
	const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
	const [showMoveUpOnly, setShowMoveUpOnly] = useState(false);


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

	// Sorting handler
	function handleSort(key) {
		setSortConfig(prev => {
			if (prev.key === key) {
				// Toggle direction if same column clicked
				return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
			} else {
				// Start with ascending for new column
				return { key, direction: "asc" };
			}
		});
	}

	// Define filteredCards here inside the component function, before return
	const filteredCards = cards.filter((cardEntry) => {
		const currentCategory = cardEntry.categories?.[0] || "Uncategorized";
		const colors = normalizeColors(cardEntry.card?.oracleCard?.colors);
		const priceUSD = cardEntry.scryfallPrice;
		
		// Compute the should-be category here
		const shouldBeCategory = getCategoryByPrice(priceUSD);

		// Determine if the card needs to move up
		const needToMoveUp = categoryRank[shouldBeCategory] > categoryRank[currentCategory];

		const matchesMismatch = !showOnlyMismatches || currentCategory !== shouldBeCategory;
		const matchesMoveUp = !showMoveUpOnly || needToMoveUp;
		const matchesCategory = selectedCategory === "All" || currentCategory === selectedCategory;
		const matchesColor =
			selectedColor === "All"
				? true
				: selectedColor.includes("/")
					? colorsToCombo(colors) === selectedColor
					: colors.length === 1 && colors[0] === selectedColor;
		const matchesShouldBe =
			selectedShouldBe === "All" || shouldBeCategory === selectedShouldBe;

		return matchesMismatch && matchesCategory && matchesColor && matchesShouldBe && matchesMoveUp;
	})
	.sort((a, b) => {
		const nameA = a.card?.oracleCard?.name?.toLowerCase() || "";
		const nameB = b.card?.oracleCard?.name?.toLowerCase() || "";
		return nameA.localeCompare(nameB);
	});

	const sortedCards = [...filteredCards];

	if (sortConfig.key) {
		sortedCards.sort((a, b) => {
			let aValue, bValue;

			switch (sortConfig.key) {
				case "name":
					aValue = a.card?.oracleCard?.name?.toLowerCase() || "";
					bValue = b.card?.oracleCard?.name?.toLowerCase() || "";
					break;
				case "price":
					aValue = a.scryfallPrice || 0;
					bValue = b.scryfallPrice || 0;
					break;
				case "currentCategory":
					aValue = a.categories?.[0] || "";
					bValue = b.categories?.[0] || "";
					break;
				case "shouldBeCategory":
					aValue = getCategoryByPrice(a.scryfallPrice);
					bValue = getCategoryByPrice(b.scryfallPrice);
					break;
				case "colors":
					aValue = normalizeColors(a.card?.oracleCard?.colors).join("/");
					bValue = normalizeColors(b.card?.oracleCard?.colors).join("/");
					break;
				case "edition":
					aValue = a.card?.edition?.editionname || "";
					bValue = b.card?.edition?.editionname || "";
					break;
				case "rarity":
					aValue = a.card?.rarity || "";
					bValue = b.card?.rarity || "";
					break;
				case "modifier":
					aValue = a.modifier || "";
					bValue = b.modifier || "";
					break;
				case "quantity":
					aValue = a.quantity || 0;
					bValue = b.quantity || 0;
					break;
				case "collectorNumber":
					aValue = a.card?.collectorNumber || "";
					bValue = b.card?.collectorNumber || "";
					break;
				default:
					aValue = "";
					bValue = "";
			}

			if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
			if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});
	}

	// Defined list of all unique should-be categories
	const allShouldBeCategories = ["All", "$1", "$2", "$3", "$4", "$5", "+$5"];

	// Build list of all unique current categories
	const allCategories = ["All", ...Array.from(new Set(cards.flatMap(c => c.categories || ["Uncategorized"]))).sort()];

	// Defined list of all unique colors/combinations
	const allColors = [
		"All",
		"White",
		"Blue",
		"Black",
		"Red",
		"Green",
		"Colorless",
		// // Two-color combos
		// "White/Blue",
		// "White/Black",
		// "White/Red",
		// "White/Green",
		// "Blue/Black",
		// "Blue/Red",
		// "Blue/Green",
		// "Black/Red",
		// "Black/Green",
		// "Red/Green",
		// // Optional three-color combos
		// "White/Blue/Black",
		// "White/Blue/Red",
		// "White/Blue/Green",
		// "White/Black/Red",
		// "White/Black/Green",
		// "White/Red/Green",
		// "Blue/Black/Red",
		// "Blue/Black/Green",
		// "Blue/Red/Green",
		// "Black/Red/Green",
		// // Add more as needed
	];


  if (loading) {
  	return <LoadingScreen onComplete={() => setLoading(false)} />;
	}

	// Main render
  return (
    <div style={{ padding: "20px" }}>
      <h1>MTG Deck Cards</h1>         {/* Title of the page */}
			{/* Filter Controls */}
			<label style={{ display: "block", marginBottom: "10px", width: "fit-content", cursor: "pointer" }}>
				<input
					type="checkbox"
					checked={showOnlyMismatches}
					onChange={(e) => setShowOnlyMismatches(e.target.checked)}
				/>
				{" "}Show Only Mismatched Cards
			</label>
			<label style={{ display: "block", marginBottom: "10px", width: "fit-content", cursor: "pointer" }}>
				<input
					type="checkbox"
					checked={showMoveUpOnly}
					onChange={(e) => setShowMoveUpOnly(e.target.checked)}
				/>
				{" "}Show Only Cards That Need to Move Up
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
					<select
						style={{ marginLeft: "5px" }}
						value={selectedColor}
						onChange={(e) => setSelectedColor(e.target.value)}
					>
						{allColors.map((color) => (
							<option key={color} value={color}>{color}</option>
						))}
					</select>
				</label>
				<label>
					Filter by Should Be In:
					<select
						style={{ marginLeft: "5px" }}
						value={selectedShouldBe}
						onChange={(e) => setSelectedShouldBe(e.target.value)}
					>
						{allShouldBeCategories.map((cat) => (
							<option key={cat} value={cat}>{cat}</option>
						))}
					</select>
				</label>
			</div>
      <div className="table-container">
				<table className="centered-table">
					<thead>
						<tr>
							<th>Quantity</th>
							<th>Collector #</th>
							<th style={{ cursor: "pointer" }} onClick={() => handleSort("name")}>
								Name {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
							</th>
							<th style={{ cursor: "pointer" }} onClick={() => handleSort("price")}>
								Price (USD) {sortConfig.key === "price" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
							</th>
							<th style={{ cursor: "pointer" }} onClick={() => handleSort("currentCategory")}>
								Current Category {sortConfig.key === "currentCategory" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
							</th>
							<th style={{ cursor: "pointer" }} onClick={() => handleSort("shouldBeCategory")}>
								Should Be In {sortConfig.key === "shouldBeCategory" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
							</th>
							<th style={{ cursor: "pointer" }} onClick={() => handleSort("colors")}>
								Color(s) {sortConfig.key === "colors" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
							</th>
							<th style={{ cursor: "pointer" }} onClick={() => handleSort("edition")}>
								Edition {sortConfig.key === "edition" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
							</th>
							<th style={{ cursor: "pointer" }} onClick={() => handleSort("rarity")}>
								Rarity {sortConfig.key === "rarity" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
							</th>
							<th style={{ cursor: "pointer" }} onClick={() => handleSort("modifier")}>
								Modifier {sortConfig.key === "modifier" ? (sortConfig.direction === "asc" ? "▲" : "▼") : ""}
							</th>							
						</tr>
					</thead>
					<tbody>
						{sortedCards.map((cardEntry) => {
							const card = cardEntry.card || {};
							const oracleCard = card.oracleCard || {};
							const priceUSD = cardEntry.scryfallPrice;
							const edition = card.edition || {};
							const currentCategory = cardEntry.categories?.[0] || "Uncategorized";
							const shouldBeCategory = getCategoryByPrice(priceUSD);
							const isMismatch = currentCategory !== shouldBeCategory;

							// Underline price if should be in a lower category
						  const moveUp = categoryRank[shouldBeCategory] > categoryRank[currentCategory];

							return (
								<tr
									key={cardEntry.id}
									style={{ 
										backgroundColor: isMismatch ? "#ffe6e6" : "white", textAlign: "center", 
										color: moveUp ? "red" : "black" // color if need to move to higher category
									}}
								>
									<td>{cardEntry.quantity}</td>
									<td>{cardEntry.card?.collectorNumber}</td>
									<td>
										{oracleCard.name && card.uid ? (
											<a
												href={`https://archidekt.com/card?name=${encodeURIComponent(oracleCard.name)}&uid=${card.uid}`}
												target="_blank"
												rel="noopener noreferrer"
												style={{ textDecoration: "underline", cursor: "pointer" }}
											>
												{oracleCard.name}
											</a>
										) : (
											oracleCard.name || "Unknown"
										)}
									</td>
									<td 
										style={{ 
											color: cardEntry.priceSource.includes("TCG") ? "green" : "blue"
										}}
									>
										${priceUSD != null ? `${priceUSD.toFixed(2)}` : "Unknown"}
									</td>
									<td>{cardEntry.categories?.join(", ")}</td>
									<td>{shouldBeCategory}</td>
									<td>{normalizeColors(oracleCard.colors).join(", ")}</td>
									<td>{edition.editionname}</td>
									<td>{capitalize(cardEntry.card?.rarity) || "Unknown"}</td>
									<td>{cardEntry.modifier}</td>									
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
