/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License").
 *  You may not use this file except in compliance with the License.
 *  A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 *  or in the "license" file accompanying this file. This file is distributed
 *  on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *  express or implied. See the License for the specific language governing
 *  permissions and limitations under the License.
 */

const isLocalDev = process.env.REACT_APP_LOCAL_DEV === 'true';
const awsRegion = process.env.REACT_APP_AWS_REGION;
const apiPath = process.env.REACT_APP_API_URL;
const websiteUrl = process.env.REACT_APP_WEBSITE_URL;
const stage = process.env.REACT_APP_STAGE;
const region = process.env.REACT_APP_REGION;
const autoLogoutTimeoutInMinutes = process.env.REACT_APP_AUTO_LOGOUT_TIMEOUT_IN_MINUTES || 30;

const branding = {
  login: {
    title: process.env.REACT_APP_LOGIN_TITLE,
    subtitle: process.env.REACT_APP_LOGIN_SUBTITLE,
    warning: process.env.REACT_APP_LOGIN_WARNING,
    tosLink: process.env.REACT_APP_LOGIN_TOS === 'true',
    links: process.env.REACT_APP_LOGIN_LINKS,
  },
  register: {
    title: process.env.REACT_APP_USER_REGISTRATION_TITLE,
    subtitle: process.env.REACT_APP_USER_REGISTRATION_SUBTITLE,
    success: process.env.REACT_APP_USER_REGISTRATION_SUCCESS,
    tosRequired: process.env.REACT_APP_USER_REGISTRATION_TOS_REQUIRED === 'true',
  },
  picsure: {
    dualBranding: process.env.REACT_APP_PICSURE_DUALBRANDING === 'true',
    url: process.env.REACT_APP_PICSURE_URL || '',
    browserTitle: process.env.REACT_APP_PICSURE_BROWSER_TITLE,
    title: process.env.REACT_APP_PICSURE_TITLE,
    subtitle: process.env.REACT_APP_PICSURE_SUBTITLE,
  },
  main: {
    browserTitle: process.env.REACT_APP_BROWSER_TITLE,
  },
  page: {
    title: process.env.REACT_APP_PAGE_TITLE,
    help: process.env.REACT_APP_HELP_URL,
  },
};

const versionAndDate = process.env.REACT_APP_VERSION_AND_DATE;

export {
  awsRegion,
  apiPath,
  isLocalDev,
  websiteUrl,
  stage,
  region,
  branding,
  autoLogoutTimeoutInMinutes,
  versionAndDate,
};
