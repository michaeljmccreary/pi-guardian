from flask import Flask
from flask_cors import CORS
from .config import Config
from .db import init_db, close_db
from .routes.auth_routes import bp as auth_bp
from .routes.devices import bp as devices_bp
from .routes.traffic import bp as traffic_bp
from .routes.protocols import bp as protocols_bp
from .routes.users import bp as users_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, supports_credentials=True)

    app.teardown_appcontext(close_db)
    init_db(app)

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(devices_bp, url_prefix="/api")
    app.register_blueprint(traffic_bp, url_prefix="/api")
    app.register_blueprint(protocols_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api")
    return app

if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=8080, debug=True)