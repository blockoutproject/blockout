"""Isolated smoke-only RevenueCat HTTP fixture; never a deployable application component."""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class RevenueCatFixture(BaseHTTPRequestHandler):
    """Serve complete synthetic evidence and an explicit test-only state control."""

    positive = True

    def do_GET(self):
        """Return one promotional sandbox subscription for the smoke identity."""
        body = json.dumps(
            {
                "items": [
                    {
                        "id": "smoke-sub",
                        "environment": "sandbox",
                        "gives_access": self.positive,
                        "product_id": None,
                        "ends_at": None,
                        "entitlements": {
                            "items": [{"id": "smoke-pro"}],
                            "next_page": None,
                        },
                    }
                ],
                "next_page": None,
            }
        ).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        """Switch synthetic evidence through the loopback-published control endpoint."""
        type(self).positive = self.path != "/inactive"
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        """Suppress request paths and payload diagnostics in the smoke fixture."""


if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 8080), RevenueCatFixture).serve_forever()
