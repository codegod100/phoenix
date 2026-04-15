{ pkgs, lib, config, inputs, ... }:

{
  # ============================================
  # Devenv Settings
  # ============================================
  
  # Set devenv root - required for flake compatibility
  devenv.root = 
    let pwd = builtins.getEnv "PWD";
    in if pwd != "" then pwd else "/tmp/phoenix-vcs-devenv";
  
  # Disable flake integration to avoid task/package issues in pure eval
  devenv.flakesIntegration = lib.mkForce false;

  # ============================================
  # Environment Variables
  # ============================================
  env = {
    # Rust/Cargo
    RUST_BACKTRACE = "1";
    RUST_LOG = "debug";
    
    # OpenSSL (required for reqwest/native-tls)
    OPENSSL_DIR = "${pkgs.openssl.dev}";
    OPENSSL_LIB_DIR = "${pkgs.openssl.out}/lib";
    OPENSSL_INCLUDE_DIR = "${pkgs.openssl.dev}/include";
    
    # PKG Config
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
  };

  # ============================================
  # Packages
  # ============================================
  packages = with pkgs; [
    # Build essentials
    pkg-config
    openssl
    openssl.dev
    
    # Rust toolchain
    rustc
    cargo
    rustfmt
    clippy
    rust-analyzer
    rustPlatform.bindgenHook
    
    # Development tools
    git
    watchexec
    cargo-watch
    cargo-edit
    cargo-deny
    
    # Nickel language support
    nickel
    nls
    
    # Nix tools
    nixpkgs-fmt
    alejandra
    
    # Debugging
    gdb
    lldb
  ];

  # ============================================
  # Rust Toolchain
  # ============================================
  # We use rust from nixpkgs directly instead of languages.rust
  # to avoid long compilation times with devenv's crate2nix approach

  # ============================================
  # Scripts
  # ============================================
  scripts = {
    build.exec = ''
      echo "🔨 Building Phoenix VCS..."
      cargo build --release
    '';

    test.exec = ''
      echo "🧪 Running tests..."
      cargo test
    '';

    lint.exec = ''
      echo "🔍 Running clippy..."
      cargo clippy --all-features -- -D warnings
    '';

    fmt.exec = ''
      echo "✨ Formatting code..."
      cargo fmt
      nixpkgs-fmt *.nix
    '';

    clean.exec = ''
      echo "🧹 Cleaning build artifacts..."
      cargo clean
    '';

    phx.exec = ''
      cargo run --bin phoenix-vcs -- "''${@}"
    '';

    dev.exec = ''
      cargo watch -x build -x test
    '';

    audit.exec = ''
      echo "🔒 Checking for security advisories..."
      cargo deny check
    '';

    bootstrap.exec = ''
      cargo run --bin phoenix-vcs -- bootstrap
    '';

    status.exec = ''
      cargo run --bin phoenix-vcs -- status
    '';
  };

  # ============================================
  # Shell Hook
  # ============================================
  enterShell = ''
    echo "🐦 Phoenix VCS Development Environment"
    echo "======================================="
    echo ""
    echo "Available commands:"
    echo "  build       - Build the project (release)"
    echo "  test        - Run all tests"
    echo "  lint        - Run clippy lints"
    echo "  fmt         - Format all code"
    echo "  clean       - Clean build artifacts"
    echo "  phx <args>  - Run phoenix-vcs binary"
    echo "  dev         - Watch mode (build + test)"
    echo "  audit       - Security and license check"
    echo "  bootstrap   - Bootstrap a Phoenix project"
    echo "  status      - Show Phoenix status"
    echo ""
    echo "Rust: $(rustc --version)"
    echo "Cargo: $(cargo --version)"
    echo ""
  '';

  # See full reference at https://devenv.sh/reference/options/
}
