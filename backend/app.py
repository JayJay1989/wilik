import ipaddress
import json
import math
import os
import secrets
import socket
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from flask_migrate import Migrate

from sqlalchemy import event

from models import AppSettings, User, db, Gift, Claim, generate_share_token

CURRENCY_OPTIONS = ["€", "$", "£", ""]
DECIMAL_SEPARATOR_OPTIONS = [",", ".", "round"]
THEME_COLORS = ["#5b5fef", "#d4a017", "#d2601a", "#c026d3"]
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15
SCRAPE_MAX_BYTES = 5 * 1024 * 1024
# different sites' bot detection disagrees on what looks suspicious: some (e.g.
# coolblue.be's AWS WAF) block a bare bot UA outright since a real browser always
# sends a full header set alongside it; others (e.g. decathlon.pl) do the opposite
# and block a browser-like UA specifically *because* the rest of the request (TLS/
# JA3 fingerprint, no JS execution) doesn't actually match a browser, while they
# let an honestly-labeled bot through. No single header set satisfies both, so
# scrape_url() tries the honest one first and only falls back to the disguised one
# on failure.
SCRAPE_HEADERS_BOT = {"User-Agent": "Mozilla/5.0 (compatible; WilikBot/1.0)"}
SCRAPE_HEADERS_BROWSER = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Upgrade-Insecure-Requests": "1",
}


def find_user_by_username(username):
    return User.query.filter(db.func.lower(User.username) == (username or "").lower()).first()


def is_safe_scrape_url(url):
    """Blocks SSRF: only allow public http(s) hosts, never loopback/private/link-local addresses."""
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return False
    try:
        addrinfo = socket.getaddrinfo(parsed.hostname, None)
    except socket.gaierror:
        return False
    for family, _, _, _, sockaddr in addrinfo:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    return True


app = Flask(__name__)
# signs the session cookie -- override via env in any real deployment
DEFAULT_DEV_SECRET_KEY = "dev-secret-change-me"
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", DEFAULT_DEV_SECRET_KEY)
if app.config["SECRET_KEY"] == DEFAULT_DEV_SECRET_KEY:
    print(
        "WARNING: SECRET_KEY is not set (using the public dev default) -- anyone can forge "
        "login sessions. Set a real SECRET_KEY in .env before exposing this outside your own machine.",
        flush=True,
    )
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///wilik.db"

# not everyone self-hosting this puts it behind HTTPS (LAN-only setups, plain http://,
# reverse proxies without TLS...) -- SESSION_COOKIE_SECURE would silently break login
# for them since browsers refuse to send a Secure cookie back over plain HTTP. Off by
# default to keep that working out of the box; opt in via .env once you're sure every
# request reaches this app over HTTPS.
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
# no legitimate flow here needs the cookie sent cross-site, so this is safe to always enable
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

# allows the React app (different port) to send/receive the session cookie
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

db.init_app(app)
migrate = Migrate(app, db)

login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Login required"}), 401


with app.app_context():
    # WAL mode lets readers and writers work concurrently instead of blocking
    # each other, which matters now that multiple users share this database.
    @event.listens_for(db.engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


@app.cli.command("bootstrap-db")
def bootstrap_db():
    """Creates the first admin account and the AppSettings row if missing.
    Run after 'flask db upgrade' -- assumes the schema already exists."""
    with app.app_context():
        if User.query.count() == 0:
            admin = User(username="Admin", is_admin=True, list_name="My wishlist", must_change_password=True)
            admin.set_password("admin")
            db.session.add(admin)
            db.session.commit()
            print("=" * 50)
            print("Created first admin account: username='Admin' password='admin'")
            print("You'll be asked to choose your own username and password on first login.")
            print("=" * 50)

        if AppSettings.query.count() == 0:
            db.session.add(AppSettings(id=1, app_name="Wilik"))
            db.session.commit()


@app.route("/api/settings")
def get_settings():
    settings = AppSettings.query.get(1)
    return jsonify(settings.to_dict())


@app.route("/api/settings", methods=["PUT"])
@login_required
def update_settings():
    if not current_user.is_admin:
        return jsonify({"error": "Admin only"}), 403
    settings = AppSettings.query.get(1)
    data = request.get_json()
    if "app_name" in data:
        app_name = data.get("app_name", "").strip()
        if not app_name:
            return jsonify({"error": "App name can't be empty"}), 400
        settings.app_name = app_name
    if "public_directory_enabled" in data:
        settings.public_directory_enabled = bool(data["public_directory_enabled"])
    db.session.commit()
    return jsonify(settings.to_dict())


@app.route("/api/public/directory")
def public_directory():
    # lets visitors find a wishlist without needing its share link -- admin-toggleable
    # since it also means every list becomes discoverable to anyone who reaches this page
    settings = AppSettings.query.get(1)
    if not settings.public_directory_enabled:
        return jsonify({"enabled": False, "lists": []})
    users = User.query.filter_by(show_in_directory=True).order_by(User.list_name).all()
    lists = [
        {
            "list_name": user.list_name or f"{user.username}'s wishlist",
            "username": user.username,
            "share_token": user.share_token,
            "theme_color": user.theme_color,
        }
        for user in users
    ]
    return jsonify({"enabled": True, "lists": lists})


@app.route("/api/account", methods=["PUT"])
@login_required
def update_account():
    data = request.get_json()

    new_username = data.get("username", current_user.username).strip()
    if not new_username:
        return jsonify({"error": "Username can't be empty"}), 400
    if new_username.lower() != current_user.username.lower() and find_user_by_username(new_username):
        return jsonify({"error": "Username already taken"}), 409

    currency = data.get("currency", current_user.currency)
    if currency not in CURRENCY_OPTIONS:
        return jsonify({"error": "Invalid currency"}), 400

    decimal_separator = data.get("decimal_separator", current_user.decimal_separator)
    if decimal_separator not in DECIMAL_SEPARATOR_OPTIONS:
        return jsonify({"error": "Invalid decimal separator"}), 400

    theme_color = data.get("theme_color", current_user.theme_color)
    if theme_color is not None and theme_color not in THEME_COLORS:
        return jsonify({"error": "Invalid theme color"}), 400

    current_user.username = new_username
    current_user.list_name = data.get("list_name", current_user.list_name)
    current_user.currency = currency
    current_user.decimal_separator = decimal_separator
    current_user.theme_color = theme_color
    current_user.show_image_placeholder = data.get(
        "show_image_placeholder", current_user.show_image_placeholder
    )
    current_user.show_background_pattern = data.get(
        "show_background_pattern", current_user.show_background_pattern
    )
    current_user.show_in_directory = data.get("show_in_directory", current_user.show_in_directory)
    db.session.commit()
    return jsonify(current_user.to_dict())


@app.route("/api/account/first-login", methods=["PUT"])
@login_required
def first_login_setup():
    if not current_user.must_change_password:
        return jsonify({"error": "Nothing to do"}), 400

    # @login_required already proved they know the current (placeholder) password;
    # asking for it again here would just be re-checking something already verified
    data = request.get_json()

    new_username = data.get("new_username", current_user.username).strip()
    if not new_username:
        return jsonify({"error": "Username can't be empty"}), 400
    if new_username.lower() != current_user.username.lower() and find_user_by_username(new_username):
        return jsonify({"error": "Username already taken"}), 409

    new_password = data.get("new_password", "")
    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400

    current_user.username = new_username
    current_user.set_password(new_password)
    current_user.must_change_password = False
    db.session.commit()
    return jsonify(current_user.to_dict())


@app.route("/api/account/password", methods=["PUT"])
@login_required
def update_password():
    # already logged in, so that's proof enough of identity; no need to also ask
    # for the current password before replacing it
    data = request.get_json()
    new_password = data.get("new_password", "")
    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400
    current_user.set_password(new_password)
    db.session.commit()
    return "", 204


@app.route("/api/login/lookup", methods=["POST"])
def login_lookup():
    # lets the login form ask for a username first, then show the right next
    # step: a password field, or straight to account setup if none is set yet
    data = request.get_json()
    user = find_user_by_username(data.get("username"))
    if user is None:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"needs_password_setup": user.password_hash is None or user.must_change_password})


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    user = find_user_by_username(data.get("username"))
    if user is None:
        return jsonify({"error": "Invalid username or password"}), 401

    now = datetime.now(timezone.utc).replace(tzinfo=None)  # naive UTC, matching the DateTime column
    if user.locked_until is not None:
        if user.locked_until > now:
            minutes_left = math.ceil((user.locked_until - now).total_seconds() / 60)
            return jsonify({"error": f"Too many failed attempts. Try again in {minutes_left} minute(s)."}), 429
        # lock has expired -- clear it so a good password below can succeed
        user.locked_until = None
        user.failed_login_attempts = 0

    # new/reset accounts (or older ones still pending a forced change) skip
    # password verification entirely -- must_change_password forces a real one right after
    needs_setup = user.password_hash is None or user.must_change_password
    if not needs_setup and not user.check_password(data.get("password", "")):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= LOGIN_MAX_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)
            user.failed_login_attempts = 0
        db.session.commit()
        return jsonify({"error": "Invalid username or password"}), 401

    user.failed_login_attempts = 0
    user.locked_until = None
    db.session.commit()
    login_user(user)
    return jsonify(user.to_dict())


@app.route("/api/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return "", 204


@app.route("/api/me")
def me():
    if not current_user.is_authenticated:
        return jsonify({"error": "Not logged in"}), 401
    return jsonify(current_user.to_dict())


@app.route("/api/users")
@login_required
def get_users():
    if not current_user.is_admin:
        return jsonify({"error": "Admin only"}), 403
    return jsonify([user.to_dict() for user in User.query.all()])


@app.route("/api/users", methods=["POST"])
@login_required
def create_user():
    if not current_user.is_admin:
        return jsonify({"error": "Admin only"}), 403
    data = request.get_json()
    if find_user_by_username(data.get("username")):
        return jsonify({"error": "Username already taken"}), 409
    # no password yet: a blank password_hash lets them log in with anything, since
    # must_change_password forces them to set a real one right after
    user = User(username=data["username"], is_admin=data.get("is_admin", False), must_change_password=True)
    db.session.add(user)
    db.session.commit()
    return jsonify(user.to_dict()), 201


@app.route("/api/users/<int:user_id>", methods=["DELETE"])
@login_required
def delete_user(user_id):
    if not current_user.is_admin:
        return jsonify({"error": "Admin only"}), 403
    if user_id == current_user.id:
        return jsonify({"error": "You can't delete your own account"}), 400
    user = db.get_or_404(User, user_id)
    db.session.delete(user)
    db.session.commit()
    return "", 204


@app.route("/api/users/<int:user_id>/reset-password", methods=["POST"])
@login_required
def reset_password(user_id):
    if not current_user.is_admin:
        return jsonify({"error": "Admin only"}), 403
    if user_id == current_user.id:
        return jsonify({"error": "Use account settings to change your own password"}), 400
    user = db.get_or_404(User, user_id)
    user.password_hash = None
    user.must_change_password = True
    db.session.commit()
    return jsonify(user.to_dict())


@app.route("/api/users/<int:user_id>", methods=["PUT"])
@login_required
def update_user(user_id):
    if not current_user.is_admin:
        return jsonify({"error": "Admin only"}), 403
    user = db.get_or_404(User, user_id)
    data = request.get_json()

    new_username = data.get("username", user.username).strip()
    if not new_username:
        return jsonify({"error": "Username can't be empty"}), 400
    if new_username.lower() != user.username.lower() and find_user_by_username(new_username):
        return jsonify({"error": "Username already taken"}), 409

    new_list_name = data.get("list_name", user.list_name).strip()
    if not new_list_name:
        return jsonify({"error": "Wishlist name can't be empty"}), 400

    user.username = new_username
    user.list_name = new_list_name
    user.show_in_directory = data.get("show_in_directory", user.show_in_directory)
    db.session.commit()
    return jsonify(user.to_dict())


@app.route("/api/scrape", methods=["POST"])
@login_required
def scrape_url():
    data = request.get_json()
    url = (data.get("url") or "").strip()
    if not url:
        return jsonify({"error": "URL is required"}), 400
    if not is_safe_scrape_url(url):
        return jsonify({"error": "That URL can't be fetched"}), 400

    def fetch(headers):
        response = requests.get(url, timeout=5, headers=headers, stream=True)
        response.raise_for_status()
        # product price data (JSON-LD) is often placed in <body>, not <head>, so read
        # a generous prefix rather than stopping at </head>
        chunks = bytearray()
        for chunk in response.iter_content(chunk_size=64 * 1024):
            chunks += chunk
            if len(chunks) >= SCRAPE_MAX_BYTES:
                break
        return bytes(chunks)

    try:
        content = fetch(SCRAPE_HEADERS_BOT)
    except requests.RequestException:
        try:
            content = fetch(SCRAPE_HEADERS_BROWSER)
        except requests.RequestException:
            return jsonify({"error": "Could not fetch that URL"}), 400

    soup = BeautifulSoup(content, "html.parser")

    def meta(*keys):
        for key in keys:
            tag = soup.find("meta", property=key) or soup.find("meta", attrs={"name": key})
            if tag and tag.get("content", "").strip():
                return tag["content"].strip()
        return None

    products = list(find_jsonld_products(soup))

    og_title = meta("og:title")
    og_description = meta("og:description")
    # some sites (e.g. Amazon) reuse one generic value for every og:title/og:description
    # on every page instead of real per-page content; JSON-LD is more trustworthy then
    og_is_generic = og_title is not None and og_title == og_description
    fallback_title = soup.title.string.strip() if soup.title and soup.title.string else None

    result = {
        "title": (None if og_is_generic else og_title) or jsonld_value(products, "name") or fallback_title,
        "image_url": (None if og_is_generic else meta("og:image", "og:image:url")) or jsonld_image(products),
        "brand": meta("product:brand", "og:brand") or jsonld_brand(products),
    }

    price = meta("product:price:amount", "og:price:amount") or jsonld_price(products)
    if price is not None:
        try:
            result["price"] = float(price)
        except (TypeError, ValueError):
            pass

    return jsonify(result)


def find_jsonld_products(soup):
    """Every schema.org Product/Book-like object on the page, including nested
    variants/editions (ProductGroup.hasVariant, Book.workExample, ...) that sites
    often use to carry the actual price instead of a top-level offer."""
    products = []
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
        except (TypeError, ValueError):
            continue

        blocks = data if isinstance(data, list) else [data]
        items = []
        for block in blocks:
            if isinstance(block, dict) and isinstance(block.get("@graph"), list):
                items.extend(block["@graph"])
            else:
                items.append(block)

        for item in list(items):
            if not isinstance(item, dict):
                continue
            for key in ("hasVariant", "workExample"):
                if isinstance(item.get(key), list):
                    items.extend(item[key])

        for item in items:
            if not isinstance(item, dict):
                continue
            item_types = item.get("@type", "")
            item_types = item_types if isinstance(item_types, list) else [item_types]
            if any(t and ("product" in str(t).lower() or "book" in str(t).lower()) for t in item_types):
                products.append(item)
    return products


def jsonld_price(products):
    for product in products:
        offers = product.get("offers")
        if isinstance(offers, list):
            offers = offers[0] if offers else None
        if not isinstance(offers, dict):
            continue
        price = offers.get("price") or (offers.get("priceSpecification") or {}).get("price")
        if price:
            return price
    return None


def jsonld_image(products):
    for product in products:
        image = product.get("image")
        if isinstance(image, list):
            image = image[0] if image else None
        if isinstance(image, dict):
            image = image.get("url")
        if image:
            return image
    return None


def jsonld_brand(products):
    for product in products:
        brand = product.get("brand")
        if isinstance(brand, dict):
            brand = brand.get("name")
        if brand:
            return brand
    return None


def jsonld_value(products, key):
    for product in products:
        value = product.get(key)
        if value:
            return value
    return None


@app.route("/api/items")
@login_required
def get_items():
    gifts = Gift.query.filter_by(owner_id=current_user.id).all()
    return jsonify([gift.to_dict() for gift in gifts])


@app.route("/api/items/<int:item_id>/rating", methods=["PATCH"])
@login_required
def update_rating(item_id):
    gift = db.get_or_404(Gift, item_id)
    if gift.owner_id != current_user.id:
        return jsonify({"error": "Not your item"}), 403
    data = request.get_json()
    gift.rating = data["rating"]
    gift.sort_order = None  # a rating change moves the item to a new group, drop its old manual position
    db.session.commit()
    return jsonify(gift.to_dict())


@app.route("/api/items/<int:item_id>/received", methods=["PATCH"])
@login_required
def update_received(item_id):
    gift = db.get_or_404(Gift, item_id)
    if gift.owner_id != current_user.id:
        return jsonify({"error": "Not your item"}), 403
    data = request.get_json()
    new_received = bool(data.get("received", True))

    # unlimited items never "run out" -- receiving one round doesn't mean the owner is
    # done wanting more, so keep it on the active list and just clear existing claims
    # instead of archiving it away like a normal (finite-quantity) item
    if gift.quantity is None and new_received:
        for claim in list(gift.claims):
            db.session.delete(claim)
        db.session.commit()
        return jsonify(gift.to_dict())

    gift.received = new_received
    db.session.commit()
    return jsonify(gift.to_dict())


@app.route("/api/items", methods=["POST"])
@login_required
def create_item():
    data = request.get_json()
    currency = data.get("currency")
    if currency is not None and currency not in CURRENCY_OPTIONS:
        return jsonify({"error": "Invalid currency"}), 400
    gift = Gift(
        owner_id=current_user.id,
        title=data["title"],
        label=data.get("label"),
        brand=data.get("brand"),
        options=data.get("options"),
        url=data.get("url"),
        image_url=data.get("image_url"),
        description=data.get("description"),
        price=data.get("price"),
        currency=currency,
        quantity=data.get("quantity", 1),
        rating=data.get("rating"),
    )
    db.session.add(gift)
    db.session.commit()
    return jsonify(gift.to_dict()), 201


@app.route("/api/items/<int:item_id>", methods=["PUT"])
@login_required
def update_item(item_id):
    gift = db.get_or_404(Gift, item_id)
    if gift.owner_id != current_user.id:
        return jsonify({"error": "Not your item"}), 403
    data = request.get_json()
    gift.title = data.get("title", gift.title)
    gift.label = data.get("label", gift.label)
    gift.brand = data.get("brand", gift.brand)
    gift.options = data.get("options", gift.options)
    gift.url = data.get("url", gift.url)
    gift.image_url = data.get("image_url", gift.image_url)
    gift.description = data.get("description", gift.description)
    gift.price = data.get("price", gift.price)

    if "currency" in data:
        new_currency = data["currency"]
        if new_currency is not None and new_currency not in CURRENCY_OPTIONS:
            return jsonify({"error": "Invalid currency"}), 400
        gift.currency = new_currency

    gift.quantity = data.get("quantity", gift.quantity)

    new_rating = data.get("rating", gift.rating)
    if new_rating != gift.rating:
        gift.sort_order = None  # rating change moves the item to a new group, drop its old manual position
    gift.rating = new_rating

    if "sort_order" in data:
        gift.sort_order = data["sort_order"]

    db.session.commit()
    return jsonify(gift.to_dict())


@app.route("/api/items/<int:item_id>", methods=["DELETE"])
@login_required
def delete_item(item_id):
    gift = db.get_or_404(Gift, item_id)
    if gift.owner_id != current_user.id:
        return jsonify({"error": "Not your item"}), 403
    db.session.delete(gift)
    db.session.commit()
    return "", 204


@app.route("/api/items/<int:item_id>/claim-info", methods=["GET"])
@login_required
def item_claim_info(item_id):
    # deliberately not part of the normal item list response (see Gift.to_dict) --
    # the owner has to actively ask, e.g. right before deleting something
    gift = db.get_or_404(Gift, item_id)
    if gift.owner_id != current_user.id:
        return jsonify({"error": "Not your item"}), 403
    return jsonify({"claimed_by": [claim.claimed_by for claim in gift.claims]})


@app.route("/api/account/share-token", methods=["POST"])
@login_required
def regenerate_share_token():
    current_user.share_token = generate_share_token()
    db.session.commit()
    return jsonify(current_user.to_dict())


# --- Public, no-login routes: reachable via a user's share link ---


@app.route("/api/public/<token>")
def public_wishlist(token):
    user = User.query.filter_by(share_token=token).first()
    if user is None:
        return jsonify({"error": "Not found"}), 404
    return jsonify(user.public_dict())


@app.route("/api/public/<token>/items")
def public_items(token):
    user = User.query.filter_by(share_token=token).first()
    if user is None:
        return jsonify({"error": "Not found"}), 404
    gifts = Gift.query.filter_by(owner_id=user.id, received=False).all()
    return jsonify([gift.to_dict(include_claim_status=True) for gift in gifts])


@app.route("/api/public/<token>/items/<int:item_id>/claim", methods=["POST"])
def claim_item(token, item_id):
    user = User.query.filter_by(share_token=token).first()
    if user is None:
        return jsonify({"error": "Not found"}), 404
    gift = db.get_or_404(Gift, item_id)
    if gift.owner_id != user.id:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Enter your name"}), 400

    # always creates a new, independent claim -- never tries to recognize an existing
    # name and reuse it, so a typo while trying to *release* a claim (see verify_claim)
    # can never silently create an unwanted extra claim instead
    claimed_count = len(gift.claims)
    if gift.quantity is not None and claimed_count >= gift.quantity:
        return jsonify({"error": "Already claimed"}), 409

    claim = Claim(gift_id=gift.id, claimed_by=name, claim_token=secrets.token_urlsafe(24))
    db.session.add(claim)
    db.session.commit()
    result = gift.to_dict(include_claim_status=True)
    result["claim_token"] = claim.claim_token  # only ever returned here, to the claimer themselves
    return jsonify(result)


@app.route("/api/public/<token>/items/<int:item_id>/verify-claim", methods=["POST"])
def verify_claim(token, item_id):
    """Confirms a name matches an existing claim without releasing it -- lets a
    visitor on a different device 'reclaim' their own item before deciding to
    actually unclaim it, instead of that happening in the same step."""
    user = User.query.filter_by(share_token=token).first()
    if user is None:
        return jsonify({"error": "Not found"}), 404
    gift = db.get_or_404(Gift, item_id)
    if gift.owner_id != user.id:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    name = data.get("name", "").strip()
    claim = Claim.query.filter(
        Claim.gift_id == gift.id, db.func.lower(Claim.claimed_by) == name.lower()
    ).first()
    if claim is None:
        return jsonify({"error": "That name doesn't match this claim"}), 403
    return jsonify({"claim_token": claim.claim_token})


@app.route("/api/public/<token>/items/<int:item_id>/unclaim", methods=["POST"])
def unclaim_item(token, item_id):
    user = User.query.filter_by(share_token=token).first()
    if user is None:
        return jsonify({"error": "Not found"}), 404
    gift = db.get_or_404(Gift, item_id)
    if gift.owner_id != user.id:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    claim_token = data.get("claim_token")
    name = data.get("name", "").strip()

    claim = None
    if claim_token:
        claim = Claim.query.filter_by(gift_id=gift.id, claim_token=claim_token).first()
    if claim is None and name:
        claim = Claim.query.filter(
            Claim.gift_id == gift.id, db.func.lower(Claim.claimed_by) == name.lower()
        ).first()
    if claim is None:
        return jsonify({"error": "That name doesn't match this claim"}), 403

    db.session.delete(claim)
    db.session.commit()
    return jsonify(gift.to_dict(include_claim_status=True))


@app.route("/api/public/<token>/items/<int:item_id>/purchased", methods=["POST"])
def set_purchased(token, item_id):
    user = User.query.filter_by(share_token=token).first()
    if user is None:
        return jsonify({"error": "Not found"}), 404
    gift = db.get_or_404(Gift, item_id)
    if gift.owner_id != user.id:
        return jsonify({"error": "Not found"}), 404
    data = request.get_json()
    claim = Claim.query.filter_by(gift_id=gift.id, claim_token=data.get("claim_token")).first()
    if claim is None:
        return jsonify({"error": "Claim it first"}), 400
    claim.purchased = bool(data.get("purchased", True))
    db.session.commit()
    return jsonify(gift.to_dict(include_claim_status=True))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
