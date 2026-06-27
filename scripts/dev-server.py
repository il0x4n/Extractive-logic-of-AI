"""Tiny dev server that disables HTTP caching so file edits show up
on the next browser reload without needing Ctrl+Shift+R."""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    print(f"Serving (no-cache) on http://localhost:{port}")
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
