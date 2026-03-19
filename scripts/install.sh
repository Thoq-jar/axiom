#!/bin/bash

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

OS_DIST=$(grep ^NAME= /etc/os-release | cut -d= -f2 | tr -d '"')
DISTRO="unsupported"
if [[ "$OS_DIST" == "Debian GNU/Linux" ]]; then
    DISTRO="debian"
elif [[ "$OS_DIST" == "Arch Linux" ]]; then
    DISTRO="arch"
fi

setup_https() {
    local positional=("$@")
    local enable_https="${positional[0]:-}"

    if [ "$enable_https" != "lan" ]; then
        echo "Skipping HTTPS. Axiom will run on HTTP."
        echo "  To enable HTTPS, re-run with: sudo bash -s -- lan"
        return
    fi

    mkdir -p /etc/axiom

    echo "Generating self-signed certificate for LAN use..."

    local CERT_DIR="/etc/axiom/tls"
    mkdir -p "$CERT_DIR"

    local LAN_IP
    LAN_IP=$(hostname -I | awk '{print $1}')

    openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 \
        -days 3650 -nodes \
        -keyout "$CERT_DIR/privkey.pem" \
        -out "$CERT_DIR/fullchain.pem" \
        -subj "/CN=axiom" \
        -addext "subjectAltName=IP:${LAN_IP},IP:127.0.0.1,DNS:localhost"

    chown -R axiom:axiom "$CERT_DIR"
    chmod 0640 "$CERT_DIR/privkey.pem"

    echo "AXIOM_TLS_CERT=$CERT_DIR/fullchain.pem" > /etc/axiom/env
    echo "AXIOM_TLS_KEY=$CERT_DIR/privkey.pem" >> /etc/axiom/env

    echo "Self-signed HTTPS configured for LAN (${LAN_IP})"
    echo "  Browsers will show a security warning — click Advanced and continue. This is normal for self-signed certs."
}

install_service() {
    cp /opt/axiom/service/axiom.service /etc/systemd/system/axiom.service
    systemctl daemon-reload
    systemctl enable axiom
    if systemctl is-active --quiet axiom; then
        systemctl restart axiom
        echo "axiom service restarted."
    else
        systemctl start axiom
        echo "axiom service installed and started."
    fi
}

install_common() {
    if ! id -u axiom &>/dev/null; then
        useradd --system --create-home --shell /usr/bin/nologin axiom
    fi
    mkdir -p /home/axiom
    chown axiom:axiom /home/axiom
    if getent group docker &>/dev/null; then
        usermod -aG docker axiom
    fi

    curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/opt/deno sh
    chown -R axiom:axiom /opt/deno

    if [ -d /opt/axiom/.git ]; then
        git config --global --add safe.directory /opt/axiom
        if ! git -C /opt/axiom pull --ff-only 2>/dev/null; then
            echo "Local repo diverged, recloning..."
            rm -rf /opt/axiom
        fi
    fi
    if [ ! -d /opt/axiom/.git ]; then
        mkdir -p /opt/axiom
        git clone https://github.com/Thoq-jar/axiom.git /opt/axiom
    fi
    chown -R axiom:axiom /opt/axiom

    setup_https "$@"
    install_service
}

install_debian() {
    apt-get update
    apt-get install -y curl git openssl
    install_common "$@"
}

install_arch() {
    pacman -Sy --noconfirm curl git openssl
    install_common "$@"
}

case "$DISTRO" in
    debian)
        install_debian "$@"
        ;;
    arch)
        install_arch "$@"
        ;;
    *)
        echo "Unsupported distro: $OS_DIST"
        echo "Supported: Debian GNU/Linux, Arch Linux"
        exit 1
        ;;
esac
