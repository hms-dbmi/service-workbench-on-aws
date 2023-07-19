#!/usr/bin/env bash
set -e

# Conda cli is related to the user, and so there's a few commands that it pulls in on bashrc source
source /home/ec2-user/.bashrc

envFiles="$1"
path="/home/ec2-user/SageMaker/.kernels"

AWS_INSTANCE_ID=$(jq --raw-output '.ResourceArn' /opt/ml/metadata/resource-metadata.json)
kernel=$(aws sagemaker list-tags --resource-arn $AWS_INSTANCE_ID \
  | jq --raw-output '.Tags[]  | select(.Key == "kernels") | .Value' )

if [ "$kernel" == "" ]; then
  echo "No custom kernel to import."
  exit 0
fi

# Download and source kernel creation script
if [ ! -d "$path/$kernel" ]; then
  aws s3 cp "$envFiles/kernels/$kernel.yml" "$path/$kernel.yml"
  echo "Installing $kernel"
  # The version of conda/mamba shipped with notebook-al2-v1 sagemaker does not have 
  # the --yes prompt to accept the nvida user agreement, so we're just passing it in here
  time mamba env create -q --file "$path/$kernel.yml" --prefix "$path/$kernel" <<< "y"
fi

# Create link to kernel folder so jupyter can find it
if [ ! -d "/home/ec2-user/anaconda3/envs/$kernel" ]; then
  echo "Linking $kernel"
  ln -s "$path/$kernel" "/home/ec2-user/anaconda3/envs/$kernel"
fi
