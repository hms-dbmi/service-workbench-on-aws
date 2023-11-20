#!/usr/bin/env bash

# JQ is pretty stable, so there's no reason why we wouldn't just use the most up-to date version
echo "Installing JQ"
yum install -y jq
echo "Finished Installing JQ"

# ------------------------------ Security Agents ----------------------------- #
# Agent installation script checks ssm parameters for three values, 
# /config/secrets_arn, /config/account_config_arn, or /config/software_bucket.
# If any of those parameters are not set, agent installation is skipped.
echo "Installing security agents"
security_agents="$WORKING_DIR/get_security_agents.sh"
aws s3 cp "$BUCKET_URI/get_security_agents.sh" "$security_agents"
# Use nohup <cmd> & to ignore the hang up signal and continue to run after script closes
chmod 500 "$security_agents"
nohup time $security_agents "$WORKING_DIR/lz-cicd-ec2-scripts" &> /var/log/security_agents.log &
echo "Security agents are installing in the background"

# --------------------------------- S3 MOUNTS -------------------------------- #
# The below script section bootstraps a workspace instance by preparing
# S3 study data to be mounted via the mount_s3.sh environment script.
# Note that mounting cannot be performed during initial bootstrapping
# because the instance's role will not yet have access to S3 study
# data since the associated resource policies aren't updated until after
# the CFN stack has been completed created.
if [ "$S3_MOUNTS" != "" -a "$S3_MOUNTS" != "[]" ]; then
  echo "Copying Goofys"
  aws s3 cp "$BUCKET_URI/offline-packages/goofys" "/usr/local/bin/goofys"
  chmod +x /usr/local/bin/goofys
  echo "Finished Copying Goofys"

  echo "Downloading and configuring S3 mount script"
  aws s3 cp "$BUCKET_URI/bin/mount_s3.sh" "/usr/local/bin/"
  chmod +x /usr/local/bin/mount_s3.sh
  printf "%s" "$S3_MOUNTS" > "/usr/local/etc/s3-mounts.json"
  echo "Finished Downloading and configuring S3 mount script"
fi

# ------------------------------ Clone Git Repos ----------------------------- #
echo "Cloning github repos"
clone_script="$WORKING_DIR/clone_repos.sh"
aws s3 cp "$BUCKET_URI/clone_repos.sh" "$clone_script"
# Whatever is copying these scripts to ec2 doesn't seem to respect permissions
# We just need execute, disregard the 00
chmod 500 "$clone_script"
$clone_script &> /var/log/clone.log &
echo "Github repos are being cloned in the background"
