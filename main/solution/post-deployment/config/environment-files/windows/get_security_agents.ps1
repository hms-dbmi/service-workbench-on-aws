# Secured project settings
$secret_arn="$(Get-SSMParameter -Name "/config/secrets_arn" -Select "Parameter.Value")"
$project="$(Get-SSMParameter -Name "/config/account_config_arn" -Select "Parameter.Value")"
$bucket="$(Get-SSMParameter -Name "/config/software_bucket" -Select "Parameter.Value")"

# Only attempt to install the security agents if the above config parameters are set in the host account.
# If they are not set, then we assume this is not an env we shoud install BCH/HMS software into, so we skip agent installation.
if ( ($secret_arn -eq $null) -or ($project -eq $null) -or ($bucket -eq $null) ) {
  Exit
}


Start-Transcript -Append C:\workdir\security_agent_install_log.txt

$install_dir=(pwd).Path

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# Install Git from github
Invoke-WebRequest "https://github.com/git-for-windows/git/releases/download/v2.40.0.windows.1/Git-2.40.0-64-bit.exe" -OutFile "$install_dir\install_git.exe"
@"
[Setup]
Lang=default
Dir=C:\Program Files\Git
Group=Git
NoIcons=0
SetupType=default
Components=icons,ext,ext\shellhere,ext\guihere,gitlfs,assoc,assoc_sh,scalar
Tasks=
EditorOption=VIM
CustomEditorPath=
DefaultBranchOption= 
PathOption=Cmd
SSHOption=OpenSSH
TortoiseOption=false
CURLOption=OpenSSL
CRLFOption=CRLFAlways
BashTerminalOption=MinTTY
GitPullBehaviorOption=Merge
UseCredentialManager=Enabled
PerformanceTweaksFSCache=Enabled
EnableSymlinks=Disabled
EnablePseudoConsoleSupport=Disabled
EnableFSMonitor=Disabled
"@ | Out-File -FilePath "$install_dir\git_config.txt"
Start-Process -Wait -NoNewWindow -FilePath "$install_dir\install_git.exe" -ArgumentList "/LOADINF=`"$install_dir\git_config.txt`" /VERYSILENT /NORESTART /NOCANCEL /SP- /CLOSEAPPLICATIONS /RESTARTAPPLICATIONS"
$Env:Path += [IO.Path]::PathSeparator + "$env:ProgramFiles\Git\bin"

# NOTES: Out-File adds BOM characters which mess up bash, and we have 
# to use bash's OpenSSH because Windows 2016 server doesn't have
# access to install it. So we're using .NET file writing and 
# git-bash commands below.

# Set up github configs and keys
New-Item "$env:UserProfile\.ssh" -ItemType Directory
[System.IO.File]::WriteAllLines("$env:UserProfile\.ssh\known_hosts", "[ssh.github.com]:443 ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBEmKSENjQEezOmxkZMy7opKgwFB9nkt5YRrYMjNuG5N87uRgg6CLrbo5wAdT/y6v0mKV0U2w0WZ2YB/++Tpockg=")
Read-S3Object -BucketName $bucket -Key 'lz-cicd-ec2-scripts-github-key.txt' -File "$env:UserProfile\.ssh\lz-cicd-ec2-scripts"
[System.IO.File]::WriteAllLines("$env:UserProfile\.ssh\config", @"
Host github.com-lz-cicd-ec2-scripts
Hostname github.com
IdentityFile /root/.ssh/lz-cicd-ec2-scripts
"@)

# Change file permissions, start ssh agent, and clone git repo using newly installed bash
bash -c @'
chmod 600 ~/.ssh/lz-cicd-ec2-scripts
eval `ssh-agent -s`
ssh-add ~/.ssh/lz-cicd-ec2-scripts
git clone ssh://git@ssh.github.com:443/hms-dbmi/lz-cicd-ec2-scripts.git ./lz-cicd-ec2-scripts
'@

."$install_dir\lz-cicd-ec2-scripts\windows\security_agents.ps1" -secret_arn $secret_arn -project $project -bucket $bucket

# Cleanup install files, key and scripts folder
Remove-Item -Path "$install_dir\git_config.txt"
Remove-Item -Path -Force "$install_dir\install_git.exe"
Remove-Item -Path "$env:UserProfile\.ssh\lz-cicd-ec2-scripts"
Remove-Item -Recurse -Force "$install_dir\lz-cicd-ec2-scripts\"

Stop-Transcript