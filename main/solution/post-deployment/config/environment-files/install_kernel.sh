#!/usr/bin/env bash
set -e

# Conda cli is related to the user, and so there's a few commands that it pulls in on bashrc source
source /home/ec2-user/.bashrc

BUCKET_URI="$1"
KERNEL_PATH="/home/ec2-user/SageMaker/.kernels"

# --------------------------- Create Custom Kernels -------------------------- #
AWS_INSTANCE_ARN=$(jq --raw-output '.ResourceArn' /opt/ml/metadata/resource-metadata.json)
kernels=$(aws sagemaker list-tags --resource-arn $AWS_INSTANCE_ARN \
  | jq --raw-output '.Tags[]  | select(.Key == "kernels") | .Value // false' )
if [ "$kernels" != "" ]; then
  for kernel in $(echo "$kernels" | tr ',' '\n'); do
    # Download and source kernel configuration and create the kernel, if it's not already created
    if [ ! -d "$KERNEL_PATH/$kernel" ]; then
      aws s3 cp "$BUCKET_URI/kernels/$kernel.yml" "$KERNEL_PATH/$kernel.yml"
      echo "Installing $kernel"
      # The version of conda/mamba shipped with notebook-al2-v1 sagemaker does not have 
      # the --yes prompt to accept the nvida user agreement, so we're just passing it in here
      time mamba env create -q --file "$KERNEL_PATH/$kernel.yml" --prefix "$KERNEL_PATH/$kernel" <<< "y"
    fi
  done
fi

# --------------------------- Load Kernels to Conda -------------------------- #
echo "Adding $KERNEL_PATH to conda configuration"
mkdir -p $KERNEL_PATH
chown ec2-user:ec2-user $KERNEL_PATH
cat << EOF >> /home/ec2-user/.condarc
envs_dirs:
  - $KERNEL_PATH
  - /home/ec2-user/anaconda3/envs
EOF
echo "Finished Adding $KERNEL_PATH to conda configuration"