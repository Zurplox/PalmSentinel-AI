import sys
import os
import threading

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Check mode for automated verification without launching GUI window
if len(sys.argv) > 1 and sys.argv[1] in ("--check", "--test", "-v", "--version"):
    try:
        import webview
        from app import app
        print("[PalmSentinel] Desktop environment & WebView2 verification: OK")
        sys.exit(0)
    except Exception as e:
        print(f"[PalmSentinel Error] Verification failed: {e}", file=sys.stderr)
        sys.exit(1)

import webview
from app import app, get_or_load_image

# Configure Edge WebView2 to strictly disable browser-level UI zoom
try:
    import webview.platforms.edgechromium as ec
    _orig_ready = ec.EdgeChrome.on_webview_ready
    def _patched_ready(self, sender, args):
        _orig_ready(self, sender, args)
        if args and getattr(args, "IsSuccess", False) and getattr(sender, "CoreWebView2", None):
            try:
                settings = sender.CoreWebView2.Settings
                settings.IsZoomControlEnabled = False
                settings.AreBrowserAcceleratorKeysEnabled = False
            except Exception as e:
                print(f"[PalmSentinel WebView2] Zoom settings note: {e}")
    ec.EdgeChrome.on_webview_ready = _patched_ready
except Exception as e:
    pass

def main():
    print("[PalmSentinel] Initializing native desktop window...")
    # Asynchronously preload default orthophoto in background thread so window pops up instantly
    threading.Thread(target=get_or_load_image, daemon=True).start()

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
