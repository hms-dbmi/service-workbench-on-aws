#!/usr/bin/env bash

# Exported env variables required before calling this script:
# BUCKET_URI, SUBNET_CIDR, WORKING_DIR, S3_MOUNTS

echo "Started bootstrap script"

load_env_script() {
  echo "Running $1 init script"
  aws s3 cp "$BUCKET_URI/environments/$1.sh" "$WORKING_DIR/environments/"
  chmod 500 $WORKING_DIR/environments/$1.sh
  $WORKING_DIR/environments/$1.sh
  echo "Finished Running $1 init script"
}

load_env_script common

if [ -d "/home/ec2-user/SageMaker" ]; then
  load_env_script sagemaker
elif [ -d "/var/log/rstudio-server" ]; then
  load_env_script rstudio
else
  load_env_script ec2
fi

echo "Finished bootstrap script"
