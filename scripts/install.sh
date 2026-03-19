#!/bin/bash

set -eu pipefail

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

check_dep() {
    $1 --version
    echo $?
}

setup_letsencrypt() {
    read -rp "Enter your domain (e.g. axiom.example.com) or leave blank to skip HTTPS: " DOMAIN

    if [ -z "$DOMAIN" ]; then
        echo "Skipping HTTPS setup. Axiom will run on HTTP."
        return
    fi

    read -rp "Enter your email for Let's Encrypt notifications: " EMAIL

    apt-get install -y certbot

    mkdir -p /opt/axiom/public/.well-known/acme-challenge

    certbot certonly --webroot --non-interactive --agree-tos \
        --webroot-path /opt/axiom/public \
        --email "$EMAIL" \
        -d "$DOMAIN"

    chmod 0755 /etc/letsencrypt/live /etc/letsencrypt/archive
    chgrp -R axiom /etc/letsencrypt/live/"$DOMAIN" /etc/letsencrypt/archive/"$DOMAIN"
    chmod 0640 /etc/letsencrypt/archive/"$DOMAIN"/privkey*.pem

    mkdir -p /etc/axiom
    echo "AXIOM_DOMAIN=$DOMAIN" > /etc/axiom/env

    cat > /etc/letsencrypt/renewal-hooks/deploy/axiom-restart <<'HOOK'
#!/bin/bash
systemctl restart axiom
HOOK
    chmod +x /etc/letsencrypt/renewal-hooks/deploy/axiom-restart

    systemctl enable --now certbot.timer 2>/dev/null || true

    echo "HTTPS configured for $DOMAIN"
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
        useradd --system --no-create-home --shell /usr/sbin/nologin axiom
    fi
    if getent group docker &>/dev/null; then
        usermod -aG docker axiom
    fi

    curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/opt/deno sh
    chown -R axiom:axiom /opt/deno

    mkdir -p /opt/axiom
    if [ ! -d /opt/axiom/.git ]; then
        git clone https://github.com/Thoq-jar/axiom.git /opt/axiom
    else
        git config --global --add safe.directory /opt/axiom
        git -C /opt/axiom pull
    fi
    chown -R axiom:axiom /opt/axiom

    setup_letsencrypt
    install_service
}

if [ $DEBIAN -eq 1 ]; then
    install_debian
else
    echo "Installing on a distro other than Debian is currently not supported! Please check back later..."
fi
