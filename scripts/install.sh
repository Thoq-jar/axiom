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

    curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/opt/deno sh
    chown -R axiom:axiom /opt/deno

    mkdir -p /opt/axiom
    if [ ! -d /opt/axiom/.git ]; then
        git clone https://github.com/Thoq-jar/axiom.git /opt/axiom
    else
        git -C /opt/axiom pull
    fi
    chown -R axiom:axiom /opt/axiom

    install_service
}

# TODO: add this
# install_generic() {
# if [ check_dep "deno" -ne "0" ]; then
#     echo "Please install deno via: 'curl -fsSL https://deno.land/install.sh | sh' or by visiting https://deno.land"
# fi
# }

if [ $DEBIAN -eq 1 ]; then
    install_debian
else
    echo "Installing on a distro other than Debian is currently not supported! Please check back later..."
fi
