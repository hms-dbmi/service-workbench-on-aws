#!/usr/bin/env bash

# We have a few example repos that we want to clone
# GIT_TERMINAL_PROMPT=0 to not attempt to log in if repo vanishes
touch /var/log/clone.log

declare -a repos=(
    "https://github.com/hms-dbmi/Access-to-Data-and-Compute-using-Service-Workbench.git"
    "https://github.com/hms-dbmi/Access-to-Data-using-PIC-SURE-API.git"
)

for repo in ${repos[@]}; do
    echo $repo
    GIT_TERMINAL_PROMPT=0 git clone $repo >> /var/log/clone.log 2>&1
done

exit 0