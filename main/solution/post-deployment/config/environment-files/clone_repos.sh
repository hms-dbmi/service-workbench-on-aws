#!/usr/bin/env bash

# We have a few example repos that we want to clone
# GIT_TERMINAL_PROMPT=0 to not attempt to log in if repo vanishes
sudo touch /var/log/clone.log
sudo chmod 777 /var/log/clone.log

return_dir = $(pwd)


chown_user = "ec2-user"
repo_dir = "/home/ec2-user/repos"
if [ -d "/home/rstudio-user" ]
then
    chown_user = "rstudio-user"
    repo_dir = "/home/rstudio-user/repos"
fi
if [ -d "/home/sagemaker-user" ]
then
    chown_user = "sagemaker-user"
    repo_dir = "/home/sagemaker-user/repos"
fi

declare -a repos=(
    "https://github.com/hms-dbmi/Access-to-Data-and-Compute-using-Service-Workbench.git"
    "https://github.com/hms-dbmi/Access-to-Data-using-PIC-SURE-API.git"
)

echo "Installing git" >> /var/log/clone.log
sudo yum update -y
sudo yum install -y git

echo "Done installing git. Cloning repos: " >> /var/log/clone.log
mkdir $repo_dir && cd $repo_dir

for repo in ${repos[@]}; do
    echo $repo
    GIT_TERMINAL_PROMPT=0 git clone $repo >> /var/log/clone.log 2>&1
done

echo "Done cloning repos. Changing ownership." >> /var/log/clone.log
cd $return_dir
sudo chown -R ec2-user repos

exit 0