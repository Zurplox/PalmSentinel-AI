import sys
import os

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import webview
from app import app, get_or_load_image

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
        zoomable=True,
        confirm_close=False
    )

    # Launch native desktop application
    webview.start(debug=False)

if __name__ == '__main__':
    main()
