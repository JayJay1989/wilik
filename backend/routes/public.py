import secrets

from flask import Blueprint, jsonify, request

from models import AppSettings, Claim, Gift, User, db

public_bp = Blueprint("public", __name__, url_prefix="/api")


@public_bp.route("/public/directory")
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


@public_bp.route("/public/<token>")
def public_wishlist(token):
    user = User.query.filter_by(share_token=token).first()
    if user is None:
        return jsonify({"error": "Not found"}), 404
    return jsonify(user.public_dict())


@public_bp.route("/public/<token>/items")
def public_items(token):
    user = User.query.filter_by(share_token=token).first()
    if user is None:
        return jsonify({"error": "Not found"}), 404
    gifts = Gift.query.filter_by(owner_id=user.id, received=False).all()
    return jsonify([gift.to_dict(include_claim_status=True) for gift in gifts])


@public_bp.route("/public/<token>/items/<int:item_id>/claim", methods=["POST"])
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


@public_bp.route("/public/<token>/items/<int:item_id>/verify-claim", methods=["POST"])
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


@public_bp.route("/public/<token>/items/<int:item_id>/unclaim", methods=["POST"])
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


@public_bp.route("/public/<token>/items/<int:item_id>/purchased", methods=["POST"])
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
