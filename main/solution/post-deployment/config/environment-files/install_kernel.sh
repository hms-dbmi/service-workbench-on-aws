#!/usr/bin/env bash

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
  aws s3 cp "$envFiles/kernels/$kernel.sh" "$path/.install_$kernel.sh"
  source $path/.install_$kernel.sh
fi

# Create link to kernel folder so jupyter can find it
if [ ! -d "/home/ec2-user/anaconda3/envs/$kernel" ]; then
  ln -s "$path/$kernel" "/home/ec2-user/anaconda3/envs/$kernel"
fi
