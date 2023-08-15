#!/bin/bash
set -e

pushd "$(dirname "${BASH_SOURCE[0]}")" > /dev/null
# shellcheck disable=SC1091
[[ $UTIL_SOURCED != yes && -f ./util.sh ]] && source ./util.sh
popd > /dev/null

# Add the version information to the stage file
./scripts/get-release-info.sh "$STAGE"

# Install
install_dependencies "$@"

function disableStats {
  COMPONENT_DIR=$1
  pushd "$SOLUTION_DIR/$COMPONENT_DIR" > /dev/null
  # Disable serverless stats (only strictly needs to be done one time)
  $EXEC sls slstats --disable
  popd > /dev/null
}

function componentDeploy {
  COMPONENT_DIR=$1
  COMPONENT_NAME=$2

  pushd "$SOLUTION_DIR/$COMPONENT_DIR" > /dev/null
  printf '\n ..... Printting path ....\n'
  printf $PWD
  printf "\nDeploying component: %s ...\n\n" "$COMPONENT_NAME"
  $EXEC sls deploy -s "$STAGE"
  printf "\nDeployed component: %s successfully \n\n" "$COMPONENT_NAME"
  popd > /dev/null
}

function goComponentDeploy() {
  COMPONENT_DIR=$1
  COMPONENT_NAME=$2

  pushd "$SOLUTION_DIR/$COMPONENT_DIR" > /dev/null
  printf "\nDeploying Go component: %s ...\n\n" "$COMPONENT_NAME"
  $EXEC sls deploy-go -s "$STAGE"
  printf "\nDeployed Go component: %s successfully \n\n" "$COMPONENT_NAME"
  popd > /dev/null
}

function upload_docker_image_ecr() {

  pushd "$SOLUTION_DIR/pre-deployment" > /dev/null
  local stack_name_pre_deployment
  stack_name_pre_deployment=$($EXEC sls info -s "$STAGE" | grep 'stack:' --ignore-case | sed 's/ //g' | cut -d':' -f2 | tr -d '\012\015')
  popd > /dev/null

  aws_region="$(cat "$CONFIG_DIR/settings/$STAGE.yml" "$CONFIG_DIR/settings/.defaults.yml" 2> /dev/null | grep '^awsRegion:' -m 1 --ignore-case | sed 's/ //g' | cut -d':' -f2 | tr -d '\012\015')"
  ECR_Repository_Name="$(aws cloudformation describe-stacks --stack-name "$stack_name_pre_deployment" --output text --region "$aws_region" --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryName`].OutputValue')"
  aws_account_number="$(aws cloudformation describe-stacks --stack-name "$stack_name_pre_deployment" --output text --region "$aws_region" --query 'Stacks[0].Outputs[?OutputKey==`AWSAccountNumber`].OutputValue')"
 
  # Deploy UI image to ECR
  pushd "$SOLUTION_DIR/ui" > /dev/null

  # first we package locally (to populate .env.local only)
  printf "\nPackaging website UI\n\n"
  $EXEC sls package-ui --local=true -s "$STAGE"
  # then we package for deployment
  # (to populate .env.production and create a build via "npm build")
  $EXEC sls package-ui -s "$STAGE"
  
  # docker commands
  aws ecr get-login-password --region $aws_region | docker login --username AWS --password-stdin $aws_account_number.dkr.ecr.$aws_region.amazonaws.com
  docker build  --platform linux/amd64 -t $ECR_Repository_Name .
  docker tag $ECR_Repository_Name:latest $aws_account_number.dkr.ecr.$aws_region.amazonaws.com/$ECR_Repository_Name:latest
  docker push $aws_account_number.dkr.ecr.$aws_region.amazonaws.com/$ECR_Repository_Name:latest

  popd > /dev/null

}

function upload_docker_image_ecr_without_build() {

  pushd "$SOLUTION_DIR/pre-deployment" > /dev/null
  local stack_name_pre_deployment
  stack_name_pre_deployment=$($EXEC sls info -s "$STAGE" | grep 'stack:' --ignore-case | sed 's/ //g' | cut -d':' -f2 | tr -d '\012\015')
  popd > /dev/null

  aws_region="$(cat "$CONFIG_DIR/settings/$STAGE.yml" "$CONFIG_DIR/settings/.defaults.yml" 2> /dev/null | grep '^awsRegion:' -m 1 --ignore-case | sed 's/ //g' | cut -d':' -f2 | tr -d '\012\015')"
  ECR_Repository_Name="$(aws cloudformation describe-stacks --stack-name "$stack_name_pre_deployment" --output text --region "$aws_region" --query 'Stacks[0].Outputs[?OutputKey==`ECRRepositoryName`].OutputValue')"
  aws_account_number="$(aws cloudformation describe-stacks --stack-name "$stack_name_pre_deployment" --output text --region "$aws_region" --query 'Stacks[0].Outputs[?OutputKey==`AWSAccountNumber`].OutputValue')"
 
  pushd "$SOLUTION_DIR/ui" > /dev/null

  npm run build
 
  aws ecr get-login-password --region $aws_region | docker login --username AWS --password-stdin $aws_account_number.dkr.ecr.$aws_region.amazonaws.com
  docker build  --platform linux/amd64 -t $ECR_Repository_Name .
  docker tag $ECR_Repository_Name:latest $aws_account_number.dkr.ecr.$aws_region.amazonaws.com/$ECR_Repository_Name:latest
  docker push $aws_account_number.dkr.ecr.$aws_region.amazonaws.com/$ECR_Repository_Name:latest

  popd > /dev/null

}

function update_lambda_proxy_env_variable() {

  pushd "$SOLUTION_DIR/backend" > /dev/null
  local stack_name_backend
  stack_name_backend=$($EXEC sls info -s "$STAGE" | grep 'stack:' --ignore-case | sed 's/ //g' | cut -d':' -f2 | tr -d '\012\015')
  popd > /dev/null

  pushd "$SOLUTION_DIR/infrastructure" > /dev/null
  local stack_name_infrastructure
  stack_name_infrastructure=$($EXEC sls info -s "$STAGE" | grep 'stack:' --ignore-case | sed 's/ //g' | cut -d':' -f2 | tr -d '\012\015')
  popd > /dev/null

  aws_region="$(cat "$CONFIG_DIR/settings/$STAGE.yml" "$CONFIG_DIR/settings/.defaults.yml" 2> /dev/null | grep '^awsRegion:' -m 1 --ignore-case | sed 's/ //g' | cut -d':' -f2 | tr -d '\012\015')"
  api_endpoint="$(aws cloudformation describe-stacks --stack-name "$stack_name_backend" --output text --region "$aws_region" --query 'Stacks[0].Outputs[?OutputKey==`ServiceEndpoint`].OutputValue')"

  lambda_proxy_arn="$(aws cloudformation describe-stacks --stack-name "$stack_name_infrastructure" --output text --region "$aws_region" --query 'Stacks[0].Outputs[?OutputKey==`LambdaProxyArn`].OutputValue')"
  aws lambda update-function-configuration --function-name $lambda_proxy_arn --environment Variables={APIGW_URL=$api_endpoint}

}

function force_new_esc_deployment() {

  pushd "$SOLUTION_DIR/infrastructure" > /dev/null
  local stack_name_infrastructure
  stack_name_infrastructure=$($EXEC sls info -s "$STAGE" | grep 'stack:' --ignore-case | sed 's/ //g' | cut -d':' -f2 | tr -d '\012\015')
  popd > /dev/null

  ClusterName="$(aws cloudformation describe-stacks --stack-name "$stack_name_infrastructure" --output text --region "$aws_region" --query 'Stacks[0].Outputs[?OutputKey==`ClusterName`].OutputValue')"
  ServiceName="$(aws cloudformation describe-stacks --stack-name "$stack_name_infrastructure" --output text --region "$aws_region" --query 'Stacks[0].Outputs[?OutputKey==`ServiceName`].OutputValue')"
  
  aws ecs update-service --cluster $ClusterName --service $ServiceName --force-new-deployment
}

componentDeploy "pre-deployment" "Pre-Deployment"

# We now need to invoke the pre deployment lambda (we can do this locally)
#$EXEC sls invoke local -f preDeployment -s $STAGE
printf "\nInvoking pre-deployment steps\n\n"
pushd "$SOLUTION_DIR/pre-deployment" > /dev/null
$EXEC sls invoke -f preDeployment -s "$STAGE"
popd > /dev/null

#Upload the dockder image without build so that 'infrastructure' get reference.
upload_docker_image_ecr_without_build

disableStats "infrastructure"
componentDeploy "infrastructure" "Infrastructure"




componentDeploy "backend" "Backend"

# update the Lambda Proxy environment variable to get APIGW URL 
update_lambda_proxy_env_variable
# update complete


componentDeploy "edge-lambda" "Edge-Lambda"
componentDeploy "post-deployment" "Post-Deployment"
goComponentDeploy "environment-tools" "Environment-Tools"

# We now need to invoke the post deployment lambda (we can do this locally)
#$EXEC sls invoke local -f postDeployment -s $STAGE
printf "\nInvoking post-deployment steps\n\n"
pushd "$SOLUTION_DIR/post-deployment" > /dev/null
$EXEC sls invoke -f postDeployment -l -s "$STAGE"
popd > /dev/null


# uploading docker image again with build version.
upload_docker_image_ecr


#Force new ECS service deployment so that it uses new uploaded image
force_new_esc_deployment

printf "\n----- ENVIRONMENT DEPLOYED SUCCESSFULLY 🎉 -----\n\n"
pushd "$(dirname "${BASH_SOURCE[0]}")" > /dev/null

# shellcheck disable=SC1091
source ./get-info.sh "$@"

popd > /dev/null
