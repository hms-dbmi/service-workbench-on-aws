export SCRIPTS="$1"
export OS="$(sed -n 's/^NAME="\([^"]*\)"/\1/p' /etc/os-release)"
export AMZ_LNX="Amazon Linux"
export CENTOS="CentOS Linux"
export REDHAT="Red Hat Enterprise Linux"
export SUSE="SLES"

function pmngr(){
  if [ "$OS" == "$SUSE" ]
    then zypper -n "$@"
    else yum -y "$@"
  fi
}
export -f pmngr

pmngr install jq

if [ -d "/home/ec2-user/SageMaker" ]
  then
    # Notebook meta-data file: https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-metadata.html
    # The resource ARN is the only way to identify this notebook instance for tagging, so we can say we're 
    # identifying the instance by the resourse ARN
    export AWS_INSTANCE_ID=$(jq --raw-output '.ResourceArn' /opt/ml/metadata/resource-metadata.json)
    # Region is already set in Sagemaker
  else
    export AWS_INSTANCE_ID=$(curl http://169.254.169.254/latest/meta-data/instance-id)
    export AWS_AVAIL_ZONE=$(curl http://169.254.169.254/latest/meta-data/placement/availability-zone)
    export AWS_REGION="$(echo "$AWS_AVAIL_ZONE" | sed 's/[a-z]$//')"
    aws configure set default.region $AWS_REGION
fi

# Secured project settings
export SECRETS_ARN="$(aws ssm get-parameter --name /config/secrets_arn | jq --raw-output .Parameter.Value)"
export PROJECT="$(aws ssm get-parameter --name /config/account_config_arn | jq --raw-output .Parameter.Value)"
export BUCKET="$(aws ssm get-parameter --name /config/software_bucket | jq --raw-output .Parameter.Value)"

# Only attempt to install the security agents if the above config parameters are set in the host account.
# If they are not set, then we assume this is not an env we shoud install BCH/HMS software into, so we skip agent installation.
if [[ ! -z "$SECRETS_ARN" ]] && [[ ! -z "$PROJECT" ]] && [[ ! -z "$BUCKET" ]]; then
  # Install git, set up private key, set up github configs, and clone scripts repo
  echo "## Pulling scripts from private repo hms-dbmi/lz-cicd-ec2-scripts"
  pmngr install git
  echo "[ssh.github.com]:443 ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=" >> ~/.ssh/known_hosts
  aws s3 cp s3://$BUCKET/lz-cicd-ec2-scripts-github-key.txt ~/.ssh/lz-cicd-ec2-scripts --sse AES256
  echo -e "Host github.com-lz-cicd-ec2-scripts\n  Hostname github.com\n  IdentityFile /root/.ssh/lz-cicd-ec2-scripts" >> ~/.ssh/config
  chmod 600 ~/.ssh/lz-cicd-ec2-scripts
  eval "$(ssh-agent -s)"
  ssh-add ~/.ssh/lz-cicd-ec2-scripts
  git clone ssh://git@ssh.github.com:443/hms-dbmi/lz-cicd-ec2-scripts.git "$SCRIPTS"
  rm -f ~/.ssh/lz-cicd-ec2-scripts

  source $SCRIPTS/util_methods.sh

  # Override util_methods update_status to just print to console
  function update_status() {
    echo "## $1"
  }
  export -f  update_status

  # Overide util_methods add_tag if the instance is a sagemaker notebook
  if [ -d "/home/ec2-user/SageMaker" ]; then
    function add_tag() {
      aws sagemaker add-tags --resource-arn $1 --tags $2
    }
    export -f add_tag
  fi

  $SCRIPTS/security_agents.sh 2>&1 >> "/var/log/security_agent_install.log"

  # Remove key and scripts folder
  rm -r "$SCRIPTS"
fi