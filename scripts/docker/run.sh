#!/usr/bin/env bash
# Runs INSIDE the container (see Dockerfile).
#
# Its whole job is to supply a Linux desktop that WebKitGTK can actually paint
# on — a display, a window manager, and Mesa's software rasteriser — and then
# hand over to `scripts/app-screenshot.mjs`, the same script Windows and macOS
# use. The screenshot logic, the settings seeding, the blank-screen check and
# the window-geometry check all live there and are not duplicated here.
#
# SKIP_BUILD=1 means the caller already produced a Linux binary. CI builds it
# natively on the runner and this image shares that glibc on purpose, so the
# build is not repeated.
set -u

cd /work

if [ "${SKIP_BUILD:-0}" = "1" ]; then
  echo "=== using the binary the caller built ==="
else
  # `beforeBuildCommand` is blanked because ui/dist is already built by the
  # caller, and a bind-mounted node_modules may hold binaries for the host's OS.
  # Building through the Tauri CLI rather than plain `cargo build` matters: the
  # latter yields a binary whose webview loads `build.devUrl`, so the window
  # renders "Could not connect to localhost: Connection refused" and looks for
  # all the world like an app that failed.
  echo "=== building (first run is slow; the cargo cache is a volume) ==="
  tauri build --debug --no-bundle --config '{"build":{"beforeBuildCommand":""}}' 2>&1 | tail -6
fi

export DISPLAY=:99
Xvfb :99 -screen 0 1600x1000x24 >/tmp/xvfb.log 2>&1 &
sleep 3
# A window manager. Without one the toplevel is never mapped and the only thing
# X ever shows is GTK's 10x10 leader window.
openbox >/tmp/openbox.log 2>&1 &
sleep 1
pgrep -a openbox >/dev/null || echo "WARNING: openbox is not running"

# Software GL. There is no GPU and no DRI3 in a container, and without llvmpipe
# WebKitGTK's web process never starts at all — which is exactly what goes wrong
# on a bare GitHub runner.
export LIBGL_ALWAYS_SOFTWARE=1
export GALLIUM_DRIVER=llvmpipe

echo "=== GL ==="
glxinfo -B 2>&1 | grep -Ei "renderer|direct rendering" | head -3 || echo "glxinfo failed"

echo "=== launching ==="
exec node scripts/app-screenshot.mjs "$@"
