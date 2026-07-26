import secrets

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


SHARE_TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"


def generate_share_token():
    return "".join(secrets.choice(SHARE_TOKEN_ALPHABET) for _ in range(8))


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)  # null = no password set yet, first login sets one
    is_admin = db.Column(db.Boolean, nullable=False, default=False)
    email = db.Column(db.String(255), nullable=True)
    list_name = db.Column(db.String(100), nullable=True)  # null = use the computed default below
    currency = db.Column(db.String(4), nullable=False, default="€")
    decimal_separator = db.Column(db.String(10), nullable=False, default=",")
    theme_color = db.Column(db.String(7), nullable=True)  # hex code, e.g. "#0d9488"; null = default theme
    must_change_password = db.Column(db.Boolean, nullable=False, default=False)
    show_image_placeholder = db.Column(db.Boolean, nullable=False, default=True)
    # unguessable token for the public, no-login wishlist link; anyone with it can view + claim items
    share_token = db.Column(db.String(64), unique=True, nullable=False, default=generate_share_token)
    # opt-out of the public directory (see AppSettings.public_directory_enabled) -- the
    # share link still works either way, this only controls the browsable listing
    show_in_directory = db.Column(db.Boolean, nullable=False, default=True)

    gifts = db.relationship("Gift", backref="owner", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        if self.password_hash is None:
            return False
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "is_admin": self.is_admin,
            "list_name": self.list_name or f"{self.username}'s wishlist",
            "currency": self.currency,
            "decimal_separator": self.decimal_separator,
            "theme_color": self.theme_color,
            "must_change_password": self.must_change_password,
            "has_password": self.password_hash is not None,
            "show_image_placeholder": self.show_image_placeholder,
            "share_token": self.share_token,
            "show_in_directory": self.show_in_directory,
        }

    def public_dict(self):
        return {
            "list_name": self.list_name or f"{self.username}'s wishlist",
            "currency": self.currency,
            "decimal_separator": self.decimal_separator,
            "theme_color": self.theme_color,
        }


class AppSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    app_name = db.Column(db.String(80), nullable=False, default="Wishdrop")
    # shows a directory of every wishlist on the login page, so visitors can find one without a share link
    public_directory_enabled = db.Column(db.Boolean, nullable=False, default=True)

    def to_dict(self):
        return {"app_name": self.app_name, "public_directory_enabled": self.public_directory_enabled}


class Gift(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    label = db.Column(db.String(50), nullable=True)
    brand = db.Column(db.String(80), nullable=True)
    options = db.Column(db.String(200), nullable=True)  # e.g. "Eau de parfum, 50ml" / "Small" / "Black or yellow"
    url = db.Column(db.String(500), nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=True)
    rating = db.Column(db.Integer, nullable=True, default=None)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    sort_order = db.Column(db.Integer, nullable=True, default=None)
    # claim/purchase state is only ever shown to public-link visitors, never to the owner (would spoil the surprise).
    # claimed_by itself is never sent to any visitor either (see to_dict) -- it only exists server-side, as the
    # fallback secret a claimer can retype from another device/browser to unclaim without their claim_token
    claimed_by = db.Column(db.String(100), nullable=True)
    # secret handed to the claimer's own browser so they can unclaim silently, without retyping their name
    claim_token = db.Column(db.String(64), nullable=True)
    purchased = db.Column(db.Boolean, nullable=False, default=False)
    # owner-controlled "I got this" flag: pulls the item off their own active list into the received archive
    received = db.Column(db.Boolean, nullable=False, default=False)

    def to_dict(self, include_claim_status=False):
        data = {
            "id": self.id,
            "title": self.title,
            "label": self.label,
            "brand": self.brand,
            "options": self.options,
            "url": self.url,
            "image_url": self.image_url,
            "description": self.description,
            "price": self.price,
            "rating": self.rating,
            "received": self.received,
            "quantity": self.quantity,
            "sort_order": self.sort_order,
        }
        if include_claim_status:
            data["claimed"] = bool(self.claimed_by)
            data["purchased"] = self.purchased
        return data
