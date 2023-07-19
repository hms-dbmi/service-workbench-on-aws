#!/usr/bin/env bash

path="/home/ec2-user/SageMaker/.kernels"

time mamba create -q -y --prefix "$path/rapids_23.06" \
  -c rapidsai -c conda-forge -c nvidia \
  libcublas ipykernel py-xgboost boto3 scikit-learn pandas pytest \
  python=3.10 cudf=23.06 cuml=23.06 cudatoolkit=11.8