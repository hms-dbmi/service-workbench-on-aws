#!/usr/bin/env bash

# --------------------------------- Idle Stop -------------------------------- #
if [ "$AUTO_STOP_IDLE_TIME" != "0" ]; then
  echo "Installing the idle stop script"
  IDLE_TIME=$(($(expr $AUTO_STOP_IDLE_TIME \* 2) > 720 ? $(expr $AUTO_STOP_IDLE_TIME \* 2) : 720)) # minimum 720 or 2(IDLE_TIME)
  sed -i "/^MAX_IDLE_MINUTES /s/=.*$/= $AUTO_STOP_IDLE_TIME/" /usr/local/bin/check-idle
  echo "auth-timeout-minutes=$IDLE_TIME" >> /etc/rstudio/rserver.conf
  mkdir -p /home/rstudio-user/.config/rstudio
  echo '{"initial_working_directory":"~","auto_save_on_blur":true,"auto_save_on_idle":"commit","posix_terminal_shell":"bash"}' > /home/rstudio-user/.config/rstudio/rstudio-prefs.json
  echo "Finished Installing the idle stop script"
fi

# --------------------------------- S3 MOUNTS -------------------------------- #
if [ "$S3_MOUNTS" != "" -a "$S3_MOUNTS" != "[]" ]; then
  # TODO: Test why we really needed this cert and why the set-password is called here...
  export PATH="/usr/local/bin:$PATH"
  set-password

  echo "Generating an SSL certificate"
  commonname=$(uname -n)
  password=dummypassword

  mkdir -p /tmp/rstudio/ssl
  chmod 700 /tmp/rstudio/ssl
  cd /tmp/rstudio/ssl

  # Generate a key
  openssl genrsa -des3 -passout pass:$password -out cert.key 2048
  # Remove passphrase from the key. Comment the line out to keep the passphrase
  openssl rsa -in cert.key -passin pass:$password -out cert.key
  # Create the request
  openssl req -new -key cert.key -out cert.csr -passin pass:$password \
    -subj "/C=NA/ST=NA/L=NA/O=NA/OU=SWB/CN=$commonname/emailAddress=example.com"
  openssl x509 -req -days 24855 -in cert.csr -signkey cert.key -out cert.pem
  # Move the certificate files to nginx directory
  mkdir -p /tmp/rstudio/generated/nginx/
  mv cert.pem "/etc/nginx/"
  mv cert.key "/etc/nginx/"
  systemctl restart nginx
  cd "../../.."
  rm -rf "/tmp/rstudio"
  echo "Finished Generating an SSL certificate"

  # TODO: Test if FUSE is really needed to mount with goofys
  echo "Installing fuse"
  yum install -y fuse-2.9.2
  echo "Finish Installing fuse"

  echo "Adding mount script to crontab"
  crontab -l 2>/dev/null > "/tmp/crontab"
  echo '@reboot sudo -u rstudio-user /usr/local/bin/mount_s3.sh >> /var/log/mount_s3.log 2>&1' >> "/tmp/crontab"
  crontab "/tmp/crontab"
  sudo -u rstudio-user /usr/local/bin/mount_s3.sh >> /var/log/mount_s3.log 2>&1
  echo "Finished Adding mount script to crontab"
fi
