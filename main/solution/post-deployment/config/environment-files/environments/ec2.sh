#!/usr/bin/env bash

iptables -A INPUT -s $SUBNET_CIDR -j DROP

# --------------------------------- S3 MOUNTS -------------------------------- #
if [ -z "$S3_MOUNTS" -o "$S3_MOUNTS" = "[]" ]
then
  echo "No S3 studies to mount - skipping"
else
  INSTALL_FILES="$WORKING_DIR/offline-packages/ec2-linux"

  # Download files for installation
  echo "Downloading required packages"
  aws s3 cp "$BUCKET_URI/offline-packages/ec2-linux/ec2-instance-connect-1.1-14.amzn2.noarch.rpm" "$INSTALL_FILES/"
  aws s3 cp "$BUCKET_URI/offline-packages/ec2-linux/fuse-2.9.2-11.amzn2.x86_64.rpm" "$INSTALL_FILES/"
  chmod 500 $INSTALL_FILES/*
  echo "Finished Downloading required packages"

  # TODO: Test where ec2-connect is used
  echo "Installing ec2-instance-connect"
  yum localinstall -y "$INSTALL_FILES/ec2-instance-connect-1.1-14.amzn2.noarch.rpm"
  echo "Finished Installing ec2-instance-connect"

  # TODO: Test if FUSE is really needed to mount with goofys
  echo "Installing fuse"
  yum localinstall -y "$INSTALL_FILES/fuse-2.9.2-11.amzn2.x86_64.rpm"
  echo "Finished Installing fuse"

  echo "Adding S3 mount script to bash profile"
  printf "\n# Mount S3 study data\nmount_s3.sh\n\n" >> "/home/ec2-user/.bash_profile"
  echo "Finished Adding S3 mount script to bash profile"
fi
