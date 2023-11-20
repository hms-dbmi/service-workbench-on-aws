#!/usr/bin/env bash

# --------------------------- Load Kernels to Conda -------------------------- #
KERNEL_PATH="/home/ec2-user/SageMaker/.kernels"
echo "Adding $KERNEL_PATH to conda configuration"
mkdir -p $KERNEL_PATH
chown ec2-user:ec2-user $KERNEL_PATH
cat << EOF >> /home/ec2-user/.condarc
envs_dirs:
  - $KERNEL_PATH
  - /home/ec2-user/anaconda3/envs
EOF
echo "Finished Adding $KERNEL_PATH to conda configuration"

# --------------------------------- Idle Stop -------------------------------- #
if [ "$AUTO_STOP_IDLE_TIME" != "0" ]; then
  echo "Installing the idle stop script"
  aws s3 cp "$BUCKET_URI/offline-packages/sagemaker/autostop.py" "/usr/local/bin"
  chmod a+x /usr/local/bin/autostop.py
  IDLE_TIME=`expr $AUTO_STOP_IDLE_TIME \* 60`
  echo "Adding the idle stop script to cron"
  (
    crontab -l 2>/dev/null
    echo "*/1 * * * * /usr/bin/python /usr/local/bin/autostop.py \
      --time $IDLE_TIME \
      --ignore-connections >> /var/log/autostop.log"
  ) | crontab -
  echo "Finished Adding the idle stop script to cron"
fi

# --------------------------------- S3 MOUNTS -------------------------------- #
# FUSE must be installed for the Jupyter configuration to run and mount the S3 studies.
update_jupyter_config() {
  config_file="$1"

  # HACK: Update the default SessionManager class used by Jupyter notebooks
  # so that it runs the S3 mount script the first time sessions are listed
  cat << EOF | cut -b5- >> "$config_file"

    import subprocess
    from notebook.services.sessions.sessionmanager import SessionManager as BaseSessionManager

    class SessionManager(BaseSessionManager):
        def list_sessions(self, *args, **kwargs):
            """Override default list_sessions() method"""
            self.mount_studies()
            result = super(SessionManager, self).list_sessions(*args, **kwargs)
            return result

        def mount_studies(self):
            """Execute mount_s3.sh if it hasn't already been run"""
            if not hasattr(self, 'studies_mounted'):
                mounting_result = subprocess.run(
                    "mount_s3.sh",
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT
                )

                # Log results
                if mounting_result.stdout:
                    for line in mounting_result.stdout.decode("utf-8").split("\n"):
                        if line: # Skip empty lines
                            self.log.info(line)

                self.studies_mounted = True

    c.NotebookApp.session_manager_class = SessionManager
EOF
}

if [ "$S3_MOUNTS" != "" -a "$S3_MOUNTS" != "[]" ]; then
  # TODO: Test if FUSE is really needed to mount with goofys
  OS_VERSION=`cat /etc/os-release | grep VERSION= | sed 's/VERSION="//' | sed 's/"//'`
  if [ $OS_VERSION = '2' ]
  then
    echo "Installing fuse for AL2"
    aws s3 sync "$BUCKET_URI/offline-packages/sagemaker/fuse-2.9.4_AL2" \
        "$WORKING_DIR/offline-packages/sagemaker/fuse-2.9.4_AL2"
    cd "$WORKING_DIR/offline-packages/sagemaker/fuse-2.9.4_AL2"
    yum --disablerepo=* localinstall -y *.rpm
    echo "Finished Installing fuse for AL2"

    echo "Installing boto3 for AL2"
    aws s3 sync "$BUCKET_URI/offline-packages/sagemaker/boto3" \
        "$WORKING_DIR/offline-packages/sagemaker/boto3"
    cd "$WORKING_DIR/offline-packages/sagemaker/boto3"
    yum --disablerepo=* localinstall -y python2-boto3-1.4.4-1.amzn2.noarch.rpm
    echo "Finished Installing boto3 for AL2"
  else
    echo "Installing fuse for AL1"
    aws s3 sync "$BUCKET_URI/offline-packages/sagemaker/fuse-2.9.4" \
        "$WORKING_DIR/offline-packages/sagemaker/fuse-2.9.4"
    cd "$WORKING_DIR/offline-packages/sagemaker/fuse-2.9.4"
    yum --disablerepo=* localinstall -y *.rpm
    echo "Finished Installing fuse for AL1"
  fi

  # Mount S3 files using mount script
  echo "Updating Jupyter Configs to mount S3 studies folder"
  update_jupyter_config "/home/ec2-user/.jupyter/jupyter_notebook_config.py"
  echo "Finished Updating Jupyter Configs to mount S3 studies folder"
fi
