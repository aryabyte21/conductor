#!/bin/bash
# Conductor Installer
# Usage: curl -fsSL https://conductor-mcp.vercel.app/install.sh | sh
#
# Detects your Mac's architecture, downloads the correct DMG from
# the latest GitHub release, installs to /Applications, and strips
# the macOS quarantine flag so the app opens without the "damaged" error.

set -e

REPO="aryabyte21/conductor"
APP_NAME="Conductor.app"
INSTALL_DIR="/Applications"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${BLUE}${BOLD}==>${NC} ${BOLD}$1${NC}"; }
ok()    { echo -e "${GREEN}${BOLD}==>${NC} ${BOLD}$1${NC}"; }
warn()  { echo -e "${YELLOW}${BOLD}==>${NC} ${BOLD}$1${NC}"; }
fail()  { echo -e "${RED}${BOLD}ERROR:${NC} $1"; exit 1; }

# ── Check platform ──────────────────────────────────────────────
[[ "$(uname)" == "Darwin" ]] || fail "This installer only supports macOS."

# ── Detect architecture ─────────────────────────────────────────
ARCH="$(uname -m)"
case "$ARCH" in
  arm64)  ARCH_PATTERN="aarch64" ;;
  x86_64) ARCH_PATTERN="x64\|x86_64\|intel" ;;
  *)      fail "Unsupported architecture: $ARCH" ;;
esac

info "Detected architecture: $ARCH"

# ── Fetch latest release ────────────────────────────────────────
info "Fetching latest release..."

RELEASE_JSON=$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest") \
  || fail "Could not reach GitHub API. Check your internet connection."

TAG=$(echo "$RELEASE_JSON" | grep '"tag_name"' | head -1 | sed 's/.*: *"\(.*\)".*/\1/')
[[ -n "$TAG" ]] || fail "Could not determine latest version."

info "Latest version: $TAG"

# ── Find the correct DMG ────────────────────────────────────────
DMG_URL=$(echo "$RELEASE_JSON" \
  | grep '"browser_download_url"' \
  | grep '\.dmg"' \
  | grep -i "$ARCH_PATTERN" \
  | head -1 \
  | sed 's/.*: *"\(.*\)".*/\1/')

[[ -n "$DMG_URL" ]] || fail "No DMG found for $ARCH in release $TAG."

DMG_NAME=$(basename "$DMG_URL")
TMP_DIR=$(mktemp -d)
DMG_PATH="$TMP_DIR/$DMG_NAME"

info "Downloading $DMG_NAME..."

# ── Download ────────────────────────────────────────────────────
curl -fSL --progress-bar -o "$DMG_PATH" "$DMG_URL" \
  || fail "Download failed."

# ── Mount & Install ─────────────────────────────────────────────
info "Installing to $INSTALL_DIR..."

MOUNT_POINT=$(hdiutil attach -nobrowse -quiet "$DMG_PATH" | tail -1 | awk '{print $NF}')

if [[ -z "$MOUNT_POINT" ]]; then
  # Fallback: extract mount point differently
  MOUNT_POINT=$(hdiutil attach -nobrowse -quiet "$DMG_PATH" 2>&1 | grep '/Volumes/' | sed 's/.*\(\/Volumes\/.*\)/\1/' | head -1)
fi

[[ -d "$MOUNT_POINT" ]] || fail "Failed to mount DMG."

# Find the .app inside the mounted DMG
APP_SOURCE=$(find "$MOUNT_POINT" -maxdepth 1 -name "*.app" -type d | head -1)
[[ -d "$APP_SOURCE" ]] || fail "No .app found in DMG."

# Remove old version if it exists
if [[ -d "$INSTALL_DIR/$APP_NAME" ]]; then
  warn "Removing previous installation..."
  rm -rf "$INSTALL_DIR/$APP_NAME"
fi

# Copy to Applications
cp -R "$APP_SOURCE" "$INSTALL_DIR/$APP_NAME"

# ── Strip quarantine ────────────────────────────────────────────
info "Removing macOS quarantine flag..."
xattr -cr "$INSTALL_DIR/$APP_NAME" 2>/dev/null || true

# ── Cleanup ─────────────────────────────────────────────────────
hdiutil detach "$MOUNT_POINT" -quiet 2>/dev/null || true
rm -rf "$TMP_DIR"

# ── Done ────────────────────────────────────────────────────────
echo ""
ok "Conductor $TAG installed successfully!"
echo ""
echo -e "   Open it from ${BOLD}Applications${NC} or run:"
echo -e "   ${BLUE}open /Applications/Conductor.app${NC}"
echo ""
