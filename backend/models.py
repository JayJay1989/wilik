from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


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
            "email": self.email,
            "list_name": self.list_name or f"{self.username}'s wishlist",
            "currency": self.currency,
            "decimal_separator": self.decimal_separator,
            "theme_color": self.theme_color,
            "must_change_password": self.must_change_password,
            "has_password": self.password_hash is not None,
            "show_image_placeholder": self.show_image_placeholder,
        }


class AppSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    app_name = db.Column(db.String(80), nullable=False, default="Wishdrop")

    def to_dict(self):
        return {"app_name": self.app_name}


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

    def to_dict(self):
        return {
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
            "quantity": self.quantity,
            "sort_order": self.sort_order,
        }
