import json
import os
from datetime import datetime
from flask import Flask, render_template, jsonify, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

app = Flask(__name__)


def load_json(name):
    path = os.path.join(DATA_DIR, name)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


QURAN_SURAHS = load_json("quran_surahs.json")
HADITH = load_json("hadith.json")
ADHKAR = load_json("adhkar.json")
QUIZ = load_json("quiz.json")
RECITERS = load_json("reciters.json")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/surahs")
def api_surahs():
    return jsonify(QURAN_SURAHS)


@app.route("/api/reciters")
def api_reciters():
    return jsonify(RECITERS)


@app.route("/api/hadith")
def api_hadith():
    book = request.args.get("book")
    if book and book in HADITH:
        return jsonify(HADITH[book])
    return jsonify(HADITH)


@app.route("/api/adhkar/<category>")
def api_adhkar(category):
    if category in ADHKAR:
        return jsonify(ADHKAR[category])
    return jsonify({"error": "not found"}), 404


@app.route("/api/quiz")
def api_quiz():
    return jsonify(QUIZ)


@app.route("/api/daily")
def api_daily():
    day_of_year = datetime.now().timetuple().tm_yday
    ayah_pool = load_json("daily_ayah.json")
    hadith_pool = HADITH.get("bukhari", []) + HADITH.get("muslim", [])
    ayah = ayah_pool[day_of_year % len(ayah_pool)]
    hadith = hadith_pool[day_of_year % len(hadith_pool)]
    return jsonify({"ayah": ayah, "hadith": hadith, "day": day_of_year})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
