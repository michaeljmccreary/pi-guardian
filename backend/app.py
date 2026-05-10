from flask import Flask
from flask_cors import CORS
from .config import Config
from .db import init_db, close_db
from .routes.auth_routes import bp as auth_bp
from .routes.devices import bp as devices_bp
from .routes.traffic import bp as traffic_bp
from .routes.users import bp as users_bp
from .routes.audit import bp as audit_bp
from apscheduler.schedulers.background import BackgroundScheduler
from .services.leases import sync_leases
from .services.dns_log import start_dns_tailer
from .services.mac_vendor import enrich_vendors
from .services.audit import start_cleanup_thread
from .services.device_monitor import start_monitor_thread
from .services.scanner import start_network_scan
from .services import audit
from .routes import scans as scans_routes
from .routes import devices as devices_routes

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, supports_credentials=True)

    app.teardown_appcontext(close_db)
    init_db(app)

#   scheduled scan disabled, the pi is not on 24/7 
    # def _nightly_scan():
    #     ids = start_network_scan()
    #     audit.log("scan", "nightly_scan", actor="system",
    #               details=f"{len(ids)} devices queued")    
    # scheduler.add_job(_nightly_scan, "cron", hour=9, minute=0, id="nightly_scan")

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(sync_leases, "interval", seconds=30, id="sync_leases")
    scheduler.add_job(enrich_vendors, "interval", minutes=5, id="enrich_vendors")
 
    scheduler.start()
    sync_leases()
    start_dns_tailer()
    start_cleanup_thread()
    start_monitor_thread()
    devices_routes.reapply_blocks()

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(devices_bp, url_prefix="/api")
    app.register_blueprint(traffic_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api")
    app.register_blueprint(audit_bp, url_prefix="/api")
    app.register_blueprint(scans_routes.bp, url_prefix="/api")
    return app

if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=8080, debug=True)