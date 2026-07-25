from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)

from sqlalchemy import event

from models import AppSettings, User, db, Gift

CURRENCY_OPTIONS = ["€", "$", "£", ""]
DECIMAL_SEPARATOR_OPTIONS = [",", ".", "round"]
THEME_COLORS = ["#5b5fef", "#d4a017", "#d2601a", "#c026d3"]
DEFAULT_PASSWORD = "changeme"  # temporary password for new/reset accounts; must_change_password forces a real one

app = Flask(__name__)
app.config["SECRET_KEY"] = "dev-secret-change-me"  # signs the session cookie
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///wishdrop.db"

# allows the React app (different port) to send/receive the session cookie
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

db.init_app(app)

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

    db.create_all()

    # Bootstrap: create the first admin account if the database is empty
    if User.query.count() == 0:
        admin = User(username="Admin", is_admin=True, list_name="My wishlist", must_change_password=True)
        admin.set_password("admin")
        db.session.add(admin)
        db.session.commit()
        print("=" * 50)
        print("Created first admin account: username='Admin' password='admin'")
        print("You'll be asked to choose your own username and password on first login.")
        print("=" * 50)

    # Bootstrap: the single AppSettings row (id=1) that holds the app name
    if AppSettings.query.count() == 0:
        db.session.add(AppSettings(id=1, app_name="Wishdrop"))
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
    app_name = data.get("app_name", "").strip()
    if not app_name:
        return jsonify({"error": "App name can't be empty"}), 400
    settings.app_name = app_name
    db.session.commit()
    return jsonify(settings.to_dict())


@app.route("/api/account", methods=["PUT"])
@login_required
def update_account():
    data = request.get_json()

    new_username = data.get("username", current_user.username).strip()
    if not new_username:
        return jsonify({"error": "Username can't be empty"}), 400
    if new_username != current_user.username and User.query.filter_by(username=new_username).first():
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
    current_user.email = data.get("email", current_user.email)
    current_user.list_name = data.get("list_name", current_user.list_name)
    current_user.currency = currency
    current_user.decimal_separator = decimal_separator
    current_user.theme_color = theme_color
    current_user.show_image_placeholder = data.get(
        "show_image_placeholder", current_user.show_image_placeholder
    )
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
    if new_username != current_user.username and User.query.filter_by(username=new_username).first():
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
    data = request.get_json()
    if not current_user.check_password(data.get("current_password", "")):
        return jsonify({"error": "Current password is incorrect"}), 401
    new_password = data.get("new_password", "")
    if len(new_password) < 8:
        return jsonify({"error": "New password must be at least 8 characters"}), 400
    current_user.set_password(new_password)
    db.session.commit()
    return "", 204


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get("username")).first()
    if user is None:
        return jsonify({"error": "Invalid username or password"}), 401
    # new/reset accounts always have DEFAULT_PASSWORD set, so this check runs for
    # them too; password_hash is only ever None for legacy rows, as a fallback
    if user.password_hash is not None and not user.check_password(data.get("password", "")):
        return jsonify({"error": "Invalid username or password"}), 401
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
    if User.query.filter_by(username=data.get("username")).first():
        return jsonify({"error": "Username already taken"}), 409
    # temporary placeholder password: the user sets their own on first login
    user = User(username=data["username"], is_admin=data.get("is_admin", False), must_change_password=True)
    user.set_password(DEFAULT_PASSWORD)
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
    user.set_password(DEFAULT_PASSWORD)
    user.must_change_password = True
    db.session.commit()
    return jsonify(user.to_dict())


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


@app.route("/api/items", methods=["POST"])
@login_required
def create_item():
    data = request.get_json()
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


if __name__ == "__main__":
    app.run(debug=True, port=5000)
