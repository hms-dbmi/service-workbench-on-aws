#!/bin/bash
set -e

# Get args
pushd "$(dirname "${BASH_SOURCE[0]}")" > /dev/null
# shellcheck disable=SC1091
[[ $UTIL_SOURCED != yes && -f ./util.sh ]] && source ./util.sh
popd > /dev/null

STAGE="$1"
FILE="main/config/settings/$STAGE.yml"

# Get new version numbers
versionHeader="$(grep -m 1 '## ' "CHANGELOG.md")"
newVersionNumber="$(echo "$versionHeader" | sed -E "s/^## \[([^]]+)]\([^)]+\) \(([^)]+)\)$/\1/")"
newVersionDate="$(echo "$versionHeader" | sed -E "s/^## \[([^]]+)]\([^)]+\) \(([^)]+)\)$/\2/")"

# Populate stage file with versionDate and versionNumber if not set
[ ! -f "$FILE" ] && touch "$FILE"
! (grep -q 'versionDate' "$FILE") && echo -e "\nversionDate: ''" >> "$FILE"
! (grep -q 'versionNumber' "$FILE") && echo -e "\nversionNumber: ''" >> "$FILE"

# Get old version values- empty if file or values did not exist
oldVersionNumber="$(sed -nE "s/^versionNumber:\s*['\"]([^'\"]*)['\"]$/\1/p" "$FILE")"
oldVersionDate="$(sed -nE "s/^versionDate:\s*['\"]([^'\"]*)['\"]$/\1/p" "$FILE")"

# Replace old versions with new version
if ([ "$oldVersionNumber" != "$newVersionNumber" ]) || ([ "$oldVersionDate" != "$newVersionDate" ]); then 
  sed -i -e "/^versionNumber: /s/.*/versionNumber: '$newVersionNumber'/" "$FILE"
  cleanDate="$(echo "$newVersionDate" | sed -e 's/\//\\\//g')"
  sed -i -e "/^versionDate: /s/.*/versionDate: '$cleanDate'/" "$FILE"
fi

grep 'versionDate\|versionNumber' "$FILE"