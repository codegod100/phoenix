#!/bin/bash
# Build panproto WASM from vendored source
# Requires: Rust, wasm-bindgen-cli

set -e

echo "🔧 Building panproto WASM from vendored source..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDOR_DIR="$SCRIPT_DIR/vendor"
WASM_DIR="$SCRIPT_DIR/wasm"

# Ensure correct wasm-bindgen version (must match Cargo.lock)
WASM_BINDGEN_VERSION="0.2.114"

cd "$VENDOR_DIR"

# Check for Rust
cargo --version > /dev/null 2>&1 || { echo "❌ Rust not installed. Install from https://rustup.rs/"; exit 1; }

# Check for wasm32 target
if ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
    echo "📦 Installing wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
fi

# Check/install correct wasm-bindgen version
if ! wasm-bindgen --version | grep -q "$WASM_BINDGEN_VERSION"; then
    echo "📦 Installing wasm-bindgen $WASM_BINDGEN_VERSION..."
    cargo install -f wasm-bindgen-cli --version "$WASM_BINDGEN_VERSION"
fi

# Build WASM
echo "🔨 Building WASM module..."
cargo build --release -p panproto-wasm --target wasm32-unknown-unknown

# Generate bindings
echo "🔗 Generating wasm-bindgen bindings..."
mkdir -p "$WASM_DIR"
wasm-bindgen --target web --out-dir "$WASM_DIR" target/wasm32-unknown-unknown/release/panproto_wasm.wasm

echo ""
echo "✅ WASM built successfully!"
echo "   Output: $WASM_DIR/"
echo ""
echo "Files:"
ls -la "$WASM_DIR/"
echo ""
echo "Usage:"
echo "   node panproto.js diff --old old.json --new new.json"
