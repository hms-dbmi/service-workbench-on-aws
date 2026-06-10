#!/usr/bin/env bash
set -euo pipefail

BUCKET_URI="${1:-}"
S3_MOUNTS="${2:-}"
INSTALL_FILES="/tmp/bootstrap"

if [[ -z "$BUCKET_URI" ]]; then
  echo "ERROR: BUCKET_URI argument is required" >&2
  exit 1
fi

mkdir -p "$INSTALL_FILES" || {
  echo "ERROR: Failed to create $INSTALL_FILES directory" >&2
  exit 1
}

echo "=> Initializing RHEL bootstrap script"

# Instance connect is required to give users SSH access with their key
echo "Installing ec2-instance-connect 2.0.0"
aws s3 cp "$BUCKET_URI/offline-packages/rhel/ec2-instance-connect-2.0.0-5.rhel9.x86_64.rpm" "$INSTALL_FILES/" || {
  echo "ERROR: Failed to download ec2-instance-connect package" >&2
  exit 1
}
aws s3 cp "$BUCKET_URI/offline-packages/rhel/ec2-instance-connect-selinux-2.0.0-5.noarch.rpm" "$INSTALL_FILES/" || {
  echo "ERROR: Failed to download ec2-instance-connect-selinux package" >&2
  exit 1
}
chmod 644 "$INSTALL_FILES/ec2-instance-connect"* || {
  echo "ERROR: Failed to set permissions on ec2-instance-connect packages" >&2
  exit 1
}
yum install -y \
  "$INSTALL_FILES/ec2-instance-connect-2.0.0-5.rhel9.x86_64.rpm" \
  "$INSTALL_FILES/ec2-instance-connect-selinux-2.0.0-5.noarch.rpm" || {
  echo "ERROR: yum install failed with exit code $?" >&2
  exit 1
}
echo "Finished Installing ec2-instance-connect"

echo "Installing JQ"
yum install -y jq || {
  echo "ERROR: Failed to install jq" >&2
  exit 1
}
echo "Finished Installing JQ"

# --------------------------------- S3 MOUNTS -------------------------------- #
# The below script section bootstraps a workspace instance by preparing
# S3 study data to be mounted via the mount_s3.sh environment script.
# Note that mounting cannot be performed during initial bootstrapping
# because the instance's role will not yet have access to S3 study
# data since the associated resource policies aren't updated until after
# the CFN stack has been completed created.
if [[ -n "$S3_MOUNTS" && "$S3_MOUNTS" != "[]" ]]; then
  echo "Installing fuse 2.9.9"
  aws s3 cp "$BUCKET_URI/offline-packages/rhel/fuse-2.9.9-17.el9.x86_64.rpm" "$INSTALL_FILES/" || {
    echo "ERROR: Failed to download fuse package" >&2
    exit 1
  }
  chmod 644 "$INSTALL_FILES/fuse-2.9.9-17.el9.x86_64.rpm" || {
    echo "ERROR: Failed to set permissions on fuse package" >&2
    exit 1
  }
  yum install -y "$INSTALL_FILES/fuse-2.9.9-17.el9.x86_64.rpm" || {
    echo "ERROR: Failed to install fuse" >&2
    exit 1
  }
  echo "Finished Installing fuse"

  echo "Copying Goofys"
  aws s3 cp "$BUCKET_URI/offline-packages/goofys" "/usr/local/bin/goofys" || {
    echo "ERROR: Failed to download goofys" >&2
    exit 1
  }
  chmod 555 /usr/local/bin/goofys || {
    echo "ERROR: Failed to set permissions on goofys" >&2
    exit 1
  }
  echo "Finished Copying Goofys"

  echo "Downloading and configuring S3 mount script"
  aws s3 cp "$BUCKET_URI/bin/mount_s3.sh" "/usr/local/bin/" || {
    echo "ERROR: Failed to download mount_s3.sh" >&2
    exit 1
  }
  chmod 555 /usr/local/bin/mount_s3.sh || {
    echo "ERROR: Failed to set permissions on mount_s3.sh" >&2
    exit 1
  }
  mkdir -p /usr/local/etc || {
    echo "ERROR: Failed to create /usr/local/etc directory" >&2
    exit 1
  }
  printf "%s" "$S3_MOUNTS" > "/usr/local/etc/s3-mounts.json" || {
    echo "ERROR: Failed to write s3-mounts.json" >&2
    exit 1
  }
  chmod 444 /usr/local/etc/s3-mounts.json || {
    echo "ERROR: Failed to set permissions on s3-mounts.json" >&2
    exit 1
  }
  echo "Finished Downloading and configuring S3 mount script"

  echo "Adding S3 mount script to bash profile"
  printf "\n# Mount S3 study data\nmount_s3.sh\n\n" >> "/home/ec2-user/.bash_profile" || {
    echo "ERROR: Failed to update bash profile" >&2
    exit 1
  }
  echo "Finished Adding S3 mount script to bash profile"
fi

# ------------------------------ Clone Git Repos ----------------------------- #
echo "Cloning github repos"
clone_script="$INSTALL_FILES/clone_repos.sh"
aws s3 cp "$BUCKET_URI/clone_repos.sh" "$clone_script" || {
  echo "ERROR: Failed to download clone_repos.sh" >&2
  exit 1
}
chmod 555 "$clone_script" || {
  echo "ERROR: Failed to set permissions on clone_repos.sh" >&2
  exit 1
}
touch /var/log/clone.log || {
  echo "ERROR: Failed to create clone.log" >&2
  exit 1
}
chmod 755 /var/log/clone.log || {
  echo "ERROR: Failed to set permissions on clone.log" >&2
  exit 1
}
"$clone_script" &> /var/log/clone.log &
clone_pid=$!
echo "Github repos are being cloned in the background (PID: $clone_pid)"

echo "=> RHEL bootstrap script execution done"