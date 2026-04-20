from flask import Blueprint, jsonify
from ..auth import login_required

bp = Blueprint("protocols", __name__)

@bp.get("/protocols")
@login_required
def list_protocols():
    return jsonify([])
