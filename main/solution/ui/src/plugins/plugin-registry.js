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
// @aws-ee/base-ui
import baseAppContextItemsPlugin from '@aws-ee/base-ui/dist/plugins/app-context-items-plugin';
import baseInitializationPlugin from '@aws-ee/base-ui/dist/plugins/initialization-plugin';
import baseAuthenticationPlugin from '@aws-ee/base-ui/dist/plugins/authentication-plugin';
import baseAppComponentPlugin from '@aws-ee/base-ui/dist/plugins/app-component-plugin';
import baseMenuItemsPlugin from '@aws-ee/base-ui/dist/plugins/menu-items-plugin';
import baseRoutesPlugin from '@aws-ee/base-ui/dist/plugins/routes-plugin';

// @aws-ee/base-workflow-ui
import workflowAppContextItemsPlugin from '@aws-ee/base-workflow-ui/dist/plugins/app-context-items-plugin';
import workflowMenuItemsPlugin from '@aws-ee/base-workflow-ui/dist/plugins/menu-items-plugin';
import workflowRoutesPlugin from '@aws-ee/base-workflow-ui/dist/plugins/routes-plugin';

// @aws-ee/environment-type-mgmt-ui
import envMgmtMenuItemsPlugin from '@aws-ee/environment-type-mgmt-ui/dist/plugins/menu-items-plugin';
import envMgmtRoutesPlugin from '@aws-ee/environment-type-mgmt-ui/dist/plugins/routes-plugin';
import envMgmtAppContextItemsPlugin from '@aws-ee/environment-type-mgmt-ui/dist/plugins/app-context-items-plugin';

// @aws-ee/key-pair-mgmt-ui
import keyPairAppContextItemsPlugin from '@aws-ee/key-pair-mgmt-ui/dist/plugins/app-context-items-plugin';
import keyPairMenuItemsPlugin from '@aws-ee/key-pair-mgmt-ui/dist/plugins/menu-items-plugin';
import keyPairRoutesPlugin from '@aws-ee/key-pair-mgmt-ui/dist/plugins/routes-plugin';

// @aws-ee/base-raas-ui
import raasAppContextItemsPlugin from '@aws-ee/base-raas-ui/dist/plugins/app-context-items-plugin';
import raasInitializationPlugin from '@aws-ee/base-raas-ui/dist/plugins/initialization-plugin';
import raasAppComponentPlugin from '@aws-ee/base-raas-ui/dist/plugins/app-component-plugin';
import raasMenuItemsPlugin from '@aws-ee/base-raas-ui/dist/plugins/menu-items-plugin';
import raasRoutesPlugin from '@aws-ee/base-raas-ui/dist/plugins/routes-plugin';
import raasEnvTypeMgmtPlugin from '@aws-ee/base-raas-ui/dist/plugins/env-type-mgmt-plugin';

// @aws-ee/register
import registerAppContextPlugin from '@aws-ee/register/dist/plugins/app-context-items-plugin';
import registerAppComponentPlugin from '@aws-ee/register/dist/plugins/app-component-plugin';
import registerRoutesPlugin from '@aws-ee/register/dist/plugins/routes-plugin';

// This repo
import appContextItemsPlugin from './app-context-items-plugin';
import initializationPlugin from './initialization-plugin';
import menuItemsPlugin from './menu-items-plugin';
import routesPlugin from './routes-plugin';

// baseAppContextItemsPlugin registers app context items (such as base MobX stores etc) provided by the base addon
// baseInitializationPlugin registers the base initialization logic provided by the base ui addon
// baseMenuItemsPlugin registers menu items provided by the base addon
// baseRoutesPlugin registers base routes provided by the base addon
const extensionPoints = {
  'app-context-items': [
    baseAppContextItemsPlugin, // @aws-ee/base-ui
    workflowAppContextItemsPlugin, // @aws-ee/base-workflow-ui
    envMgmtAppContextItemsPlugin, // @aws-ee/environment-type-mgmt-ui
    keyPairAppContextItemsPlugin, // @aws-ee/key-pair-mgmt-ui
    raasAppContextItemsPlugin, // @aws-ee/base-raas-ui
    registerAppContextPlugin, // @aws-ee/register
    appContextItemsPlugin, // ./app-context-items-plugin
  ],
  'initialization': [
    baseInitializationPlugin, // @aws-ee/base-ui
    raasInitializationPlugin, // @aws-ee/base-raas-ui
    initializationPlugin, // ./initialization-plugin
  ],
  'authentication': [
    baseAuthenticationPlugin, // @aws-ee/base-ui
  ],
  'app-component': [
    baseAppComponentPlugin, // @aws-ee/base-ui
    raasAppComponentPlugin, // @aws-ee/base-raas-ui
    registerAppComponentPlugin, // @aws-ee/register
  ],
  'menu-items': [
    baseMenuItemsPlugin, // @aws-ee/base-ui
    workflowMenuItemsPlugin, // @aws-ee/base-workflow-ui
    envMgmtMenuItemsPlugin, // @aws-ee/environment-type-mgmt-ui
    keyPairMenuItemsPlugin, // @aws-ee/key-pair-mgmt-ui
    raasMenuItemsPlugin, // @aws-ee/base-raas-ui
    menuItemsPlugin, // ./menu-items-plugin
  ],
  'routes': [
    baseRoutesPlugin, // @aws-ee/base-ui
    workflowRoutesPlugin, // @aws-ee/base-workflow-ui
    envMgmtRoutesPlugin, // @aws-ee/environment-type-mgmt-ui
    keyPairRoutesPlugin, // @aws-ee/key-pair-mgmt-ui
    raasRoutesPlugin, // @aws-ee/base-raas-ui
    registerRoutesPlugin, // @aws-ee/register
    routesPlugin, // ./routes-plugin
  ],
  'env-type-management': [
    raasEnvTypeMgmtPlugin, // @aws-ee/base-raas-ui
  ],
};

function getPlugins(extensionPoint) {
  return extensionPoints[extensionPoint];
}

const registry = {
  getPlugins,
};

export default registry;
