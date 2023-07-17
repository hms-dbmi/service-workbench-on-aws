#!/usr/bin/env bash

# Conda cli is related to the user, and so there's a few commands that it pulls in on bashrc source
source /home/ec2-user/.bashrc

bucket="$1"
path="$2" # like /home/ec2-user/anaconda3/envs or /home/ec2-user/SageMaker/.kernels

# kernel information stored in "kernel" tag on notebook with value like "rapids_23.X=SM-al2-v1_rapids-23.06"
AWS_INSTANCE_ID=$(jq --raw-output '.ResourceArn' /opt/ml/metadata/resource-metadata.json)
kernel=$(aws sagemaker list-tags --resource-arn $AWS_INSTANCE_ID \
  | jq --raw-output '.Tags[]  | select(.Key == "kernels") | .Value' )
kernel_name="${kernel%%=*}"
kernel_filename="${kernel#*=}"

if [ "$kernel_name" == "" ]; then
  echo "No custom kernel to import."
  exit 0
fi

# Download and unpack kernel if it doesn't exist
if [ ! -d "$path/$kernel_name" ]; then
  aws s3 cp "$bucket/kernels/$kernel_filename.zip" "/tmp/kernels/$kernel_filename.zip"
  
  mkdir -p "$path"
  unzip -nq "/tmp/kernels/$kernel_filename.zip" -d "$path/$kernel_name"
fi

# Create link to custom folder, if it's not anaconda envs
if [ "$path" != "/home/ec2-user/anaconda3/envs" ] && [ ! -d "/home/ec2-user/anaconda3/envs/$kernel_name" ]; then
  ln -s "$path/$kernel_name" "/home/ec2-user/anaconda3/envs/$kernel_name"
fi

# Activate the kernel
conda activate $kernel_name
python -m ipykernel install --user --name $kernel_name

