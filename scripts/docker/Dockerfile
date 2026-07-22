# A Linux box that can build and RUN Freally Teleprompt.
#
# This exists because a bare GitHub runner cannot answer "does the app render on
# Linux?". There, WebKitGTK's web process never starts and the app logs
#   libEGL warning: DRI3 error: Could not get DRI3 device
# so no window is ever created and the screenshot is a black frame. It looks
# exactly like a broken app and is not one.
#
# In here, Mesa's llvmpipe gives a real GL context ("direct rendering: Yes"),
# WebKitWebProcess starts, and the app paints a full window — which is how we
# know Linux rendering is fine and the runner was the outlier. CI now runs the
# built binary inside this image for that reason.
#
# Local use:  scripts/docker/linux-render.sh
#
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive

# Tauri v2's Linux stack, plus the tray's appindicator — the same list
# `.github/actions/linux-deps` installs, so the container matches CI.
RUN apt-get update && apt-get install -y --no-install-recommends \
      pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev librsvg2-dev patchelf \
      libxdo-dev libssl-dev libayatana-appindicator3-dev \
  # A display, a window manager, and the tools to look at both.
      xvfb x11-utils xdotool imagemagick openbox procps \
  # Mesa's software rasteriser: no GPU and no DRI3 in a container either, so
  # WebKitGTK needs llvmpipe to get a GL context at all.
      libgl1-mesa-dri libglx-mesa0 mesa-utils \
      libgles2 libegl1 \
      curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Node 22, because the app must be built through the Tauri CLI exactly as CI
# builds it. A plain `cargo build` produces a binary whose webview loads
# `build.devUrl` instead of the bundled `frontendDist`, and the window then
# renders "Could not connect to localhost: Connection refused" — a harness
# artifact that looks exactly like a broken app.
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && rm -rf /var/lib/apt/lists/*

# The Tauri CLI for LINUX. The repo's own node_modules is bind-mounted from a
# Windows host, so its copy ships the win32 native binding and cannot run here
# ("Cannot find module '@tauri-apps/cli-linux-x64-gnu'").
RUN npm install -g @tauri-apps/cli@2

# Rust, for the LOCAL flow — a Windows host cannot produce a Linux binary, so
# the container has to build one. CI skips this entirely (SKIP_BUILD=1): it
# builds natively on the runner, and this image shares that glibc so the binary
# runs here unchanged.
ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable \
  && cargo --version

WORKDIR /work
