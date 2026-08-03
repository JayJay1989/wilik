from flask import Blueprint, jsonify, request
from flask_login import current_user, login_required

from helpers import CURRENCY_OPTIONS
from models import Gift, db

items_bp = Blueprint("items", __name__, url_prefix="/api")


@items_bp.route("/items")
@login_required
def get_items():
    gifts = Gift.query.filter_by(owner_id=current_user.id).all()
    return jsonify([gift.to_dict() for gift in gifts])


@items_bp.route("/items/<int:item_id>/rating", methods=["PATCH"])
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


@items_bp.route("/items/<int:item_id>/received", methods=["PATCH"])
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


@items_bp.route("/items", methods=["POST"])
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


@items_bp.route("/items/<int:item_id>", methods=["PUT"])
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


@items_bp.route("/items/<int:item_id>", methods=["DELETE"])
@login_required
def delete_item(item_id):
    gift = db.get_or_404(Gift, item_id)
    if gift.owner_id != current_user.id:
        return jsonify({"error": "Not your item"}), 403
    db.session.delete(gift)
    db.session.commit()
    return "", 204


@items_bp.route("/items/<int:item_id>/claim-info", methods=["GET"])
@login_required
def item_claim_info(item_id):
    # deliberately not part of the normal item list response (see Gift.to_dict) --
    # the owner has to actively ask, e.g. right before deleting something
    gift = db.get_or_404(Gift, item_id)
    if gift.owner_id != current_user.id:
        return jsonify({"error": "Not your item"}), 403
    return jsonify({"claimed_by": [claim.claimed_by for claim in gift.claims]})
