from flask import Blueprint, jsonify
from ..auth import login_required

bp = Blueprint("traffic", __name__)

@bp.get("/traffic")
@login_required
def list_traffic():
    return jsonify([])
