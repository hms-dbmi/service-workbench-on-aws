#!/usr/bin/env bash

# We have a few example repos that we want to clone
# GIT_TERMINAL_PROMPT=0 to not attempt to log in if repo vanishes
return_dir=$(pwd)


chown_user="ec2-user"
repo_dir="/home/ec2-user/example_workflows"
branch="dev"

GIT_TERMINAL_PROMPT=0
if [ -d "/home/rstudio-user" ]
then
    chown_user="rstudio-user"
    repo_dir="/home/rstudio-user/example_workflows"
fi

declare -a repos=(
    "https://github.com/hms-dbmi/Access-to-Data-and-Compute-using-Service-Workbench.git"
    "https://github.com/hms-dbmi/Access-to-Data-using-PIC-SURE-API.git"
)

echo "Installing git"
sudo yum update -y
sudo yum install -y git

echo "Done installing git. Cloning repos: "
mkdir $repo_dir && cd $repo_dir

for repo in ${repos[@]}; do
    echo $repo
    if ! git clone -b $branch $repo; then
        git clone $repo
    fi
done

echo "Done cloning repos. Changing ownership."
sudo chown -R $chown_user $repo_dir

# symlinks inside symlinks doesn't seem to work, so we're just going to cp these to the sample notebooks
if [ -d "/home/ec2-user/sample-notebooks" ]
then
    # None of the sample notebooks work, so get rid of them and add our own
    sudo rm -rf /home/ec2-user/sample-notebooks/*
    sudo cp -r $repo_dir/* /home/ec2-user/sample-notebooks/
fi
cd $return_dir

exit 0
