"""Local dev server for daf-study. Same as `python -m http.server` but
disables caching, since the preview browser was serving stale JS/CSS
after edits. Not used in production — GitHub Pages serves the static
files directly."""
import http.server
import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8420


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Clear-Site-Data", '"cache"')
        super().end_headers()


http.server.test(HandlerClass=NoCacheHandler, port=port)
