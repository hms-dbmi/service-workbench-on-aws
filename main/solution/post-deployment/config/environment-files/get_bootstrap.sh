#!/usr/bin/env bash
bootstrap_s3_location="$1"
s3_mounts="$2"

INSTALL_DIR="/usr/local/share/workspace-environment"

# Download instance files and execute bootstrap script
sudo mkdir "$INSTALL_DIR"
sudo aws s3 sync "$bootstrap_s3_location" "$INSTALL_DIR"

clone_script="$INSTALL_DIR/clone_repos.sh"
if [ -s "$clone_script" ]
then
    sudo touch /var/log/clone.log
    sudo chmod 777 /var/log/clone.log
    # Whatever is copying these scripts to ec2 doesn't seem to respect permissions
    # We just need execute, disregard the 00
    sudo chmod 500 "$clone_script"
    sudo $clone_script >> /var/log/clone.log
fi

bootstrap_script="$INSTALL_DIR/bootstrap.sh"
if [ -s "$bootstrap_script" ]
then
    sudo chmod 500 "$bootstrap_script"
    sudo "$bootstrap_script" "$s3_mounts"
fi

exit 0
