from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

import requests
import os

# Get absolute path to the project root (MTGPriceTracker)
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Path to React build folder: MTGPriceTracker/client/dist
static_folder_path = os.path.join(project_root, 'client', 'dist')

# app = Flask(__name__)
app = Flask(__name__, static_folder=static_folder_path, static_url_path='/')
CORS(app)

test_deck_id = 14985045  # Example deck ID for testing
mason_deck_id = 11731123  # Deck ID for Mason's deck

# Dummy function to fetch deck JSON from Archidekt
def fetch_deck(deck_id=mason_deck_id):
    url = f"https://archidekt.com/api/decks/{deck_id}/"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        return None

def extract_cards(deck_json):
    return deck_json.get("cards", [])


@app.route("/")
def home():
		return send_from_directory(app.static_folder, "index.html")


@app.route("/api/cards")
def get_cards():
    deck_json = fetch_deck()
    if not deck_json:
        return jsonify({"error": "Failed to fetch deck"}), 500
    
    cards = extract_cards(deck_json)
    
    return jsonify(cards)
  
@app.route('/api/health')
def health_check():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    # app.run(debug=True)
    app.run()
    
