import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import webview
from app import app, get_or_load_image

# Configure Edge WebView2 to strictly disable browser-level UI zoom
try:
    import webview.platforms.edgechromium as ec
    _orig_ready = ec.EdgeChrome.on_webview_ready
    def _patched_ready(self, sender, args):
        _orig_ready(self, sender, args)
        if args.IsSuccess and sender.CoreWebView2:
            try:
                settings = sender.CoreWebView2.Settings
                settings.IsZoomControlEnabled = False
                settings.AreBrowserAcceleratorKeysEnabled = False
            except Exception as e:
                pass
    ec.EdgeChrome.on_webview_ready = _patched_ready
except Exception:
    pass

def main():
    print("[PalmSentinel] Initializing native desktop window...")
    get_or_load_image()

    # Create standalone desktop window
    window = webview.create_window(
        title="🌴 PalmSentinel AI — Enterprise Drone Sensus Platform",
        url=app,
        width=1400,
        height=900,
        min_size=(1000, 650),
        text_select=True,
        zoomable=False,
        confirm_close=False
    )

    # Launch native desktop application
    webview.start(debug=False)

if __name__ == '__main__':
    main()
