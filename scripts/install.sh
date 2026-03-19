#!/bin/bash

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root"
   exit 1
fi

OS_DIST=$(grep ^NAME= /etc/os-release | cut -d= -f2 | tr -d '"')
DEBIAN=0
if [ "$OS_DIST" != "Debian GNU/Linux" ]; then
    echo "Not on Debian, install will not be automated!"
else
    DEBIAN=1
fi

AXIOM_DOMAIN="${AXIOM_DOMAIN:-}"
AXIOM_EMAIL="${AXIOM_EMAIL:-}"

POSITIONAL=()
for arg in "$@"; do
    [[ "$arg" == -* ]] && continue
    POSITIONAL+=("$arg")
done
if [ -z "$AXIOM_DOMAIN" ] && [ "${#POSITIONAL[@]}" -ge 1 ]; then
    AXIOM_DOMAIN="${POSITIONAL[0]}"
fi
if [ -z "$AXIOM_EMAIL" ] && [ "${#POSITIONAL[@]}" -ge 2 ]; then
    AXIOM_EMAIL="${POSITIONAL[1]}"
fi

setup_https() {
    if [ -z "$AXIOM_DOMAIN" ]; then
        echo "No domain specified. Skipping HTTPS. Axiom will run on HTTP."
        echo "  To enable HTTPS, re-run with:"
        echo "    Public (NOT RECOMMEND):  curl ... | sudo bash -s -- your.domain you@mail.com"
        echo "    LAN:                     curl ... | sudo bash -s -- lan"
        return
    fi

    mkdir -p /etc/axiom

    if [ "$AXIOM_DOMAIN" = "lan" ]; then
        setup_selfsigned
    else
        setup_letsencrypt
    fi
}

setup_selfsigned() {
    echo "Generating self-signed certificate for LAN use..."

    apt-get install -y openssl

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
    echo "  Browsers will show a security warning, click advanced and continue. This is normal for self-signed certs."
}

setup_letsencrypt() {
    if [ -z "$AXIOM_EMAIL" ]; then
        echo "Error: AXIOM_EMAIL is required for Let's Encrypt."
        echo "  Usage: AXIOM_DOMAIN=your.domain AXIOM_EMAIL=you@mail.com ./scripts/install.sh"
        exit 1
    fi

    echo "Setting up Let's Encrypt for ${AXIOM_DOMAIN}..."

    apt-get install -y certbot

    mkdir -p /opt/axiom/public/.well-known/acme-challenge

    certbot certonly --webroot --non-interactive --agree-tos \
        --webroot-path /opt/axiom/public \
        --email "$AXIOM_EMAIL" \
        -d "$AXIOM_DOMAIN"

    chmod 0755 /etc/letsencrypt/live /etc/letsencrypt/archive
    chgrp -R axiom /etc/letsencrypt/live/"$AXIOM_DOMAIN" /etc/letsencrypt/archive/"$AXIOM_DOMAIN"
    chmod 0640 /etc/letsencrypt/archive/"$AXIOM_DOMAIN"/privkey*.pem

    local CERT="/etc/letsencrypt/live/${AXIOM_DOMAIN}/fullchain.pem"
    local KEY="/etc/letsencrypt/live/${AXIOM_DOMAIN}/privkey.pem"

    echo "AXIOM_DOMAIN=$AXIOM_DOMAIN" > /etc/axiom/env
    echo "AXIOM_TLS_CERT=$CERT" >> /etc/axiom/env
    echo "AXIOM_TLS_KEY=$KEY" >> /etc/axiom/env

    cat > /etc/letsencrypt/renewal-hooks/deploy/axiom-restart <<'HOOK'
#!/bin/bash
systemctl restart axiom
HOOK
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/axiom-restart

    systemctl enable --now certbot.timer 2>/dev/null || true

    echo "HTTPS configured for $AXIOM_DOMAIN"
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

install_debian() {
    apt-get update
    apt-get install -y curl git

    if ! id -u axiom &>/dev/null; then
        useradd --system --create-home --shell /usr/sbin/nologin axiom
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

    setup_https
    install_service
}

if [ $DEBIAN -eq 1 ]; then
    install_debian
else
    echo "Installing on a distro other than Debian is currently not supported! Please check back later..."
fi
