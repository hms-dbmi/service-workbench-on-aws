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
// @amzn/base-ui
import baseAppContextItemsPlugin from '@amzn/base-ui/dist/plugins/app-context-items-plugin';
import baseInitializationPlugin from '@amzn/base-ui/dist/plugins/initialization-plugin';
import baseAuthenticationPlugin from '@amzn/base-ui/dist/plugins/authentication-plugin';
import baseAppComponentPlugin from '@amzn/base-ui/dist/plugins/app-component-plugin';
import baseMenuItemsPlugin from '@amzn/base-ui/dist/plugins/menu-items-plugin';
import baseRoutesPlugin from '@amzn/base-ui/dist/plugins/routes-plugin';

// @amzn/base-workflow-ui
import workflowAppContextItemsPlugin from '@amzn/base-workflow-ui/dist/plugins/app-context-items-plugin';
import workflowMenuItemsPlugin from '@amzn/base-workflow-ui/dist/plugins/menu-items-plugin';
import workflowRoutesPlugin from '@amzn/base-workflow-ui/dist/plugins/routes-plugin';

// @amzn/environment-type-mgmt-ui
import envMgmtMenuItemsPlugin from '@amzn/environment-type-mgmt-ui/dist/plugins/menu-items-plugin';
import envMgmtRoutesPlugin from '@amzn/environment-type-mgmt-ui/dist/plugins/routes-plugin';
import envMgmtAppContextItemsPlugin from '@amzn/environment-type-mgmt-ui/dist/plugins/app-context-items-plugin';

// @amzn/key-pair-mgmt-ui
import keyPairAppContextItemsPlugin from '@amzn/key-pair-mgmt-ui/dist/plugins/app-context-items-plugin';
import keyPairMenuItemsPlugin from '@amzn/key-pair-mgmt-ui/dist/plugins/menu-items-plugin';
import keyPairRoutesPlugin from '@amzn/key-pair-mgmt-ui/dist/plugins/routes-plugin';

// @amzn/base-raas-ui
import raasAppContextItemsPlugin from '@amzn/base-raas-ui/dist/plugins/app-context-items-plugin';
import raasInitializationPlugin from '@amzn/base-raas-ui/dist/plugins/initialization-plugin';
import raasAppComponentPlugin from '@amzn/base-raas-ui/dist/plugins/app-component-plugin';
import raasMenuItemsPlugin from '@amzn/base-raas-ui/dist/plugins/menu-items-plugin';
import raasRoutesPlugin from '@amzn/base-raas-ui/dist/plugins/routes-plugin';
import raasEnvTypeMgmtPlugin from '@amzn/base-raas-ui/dist/plugins/env-type-mgmt-plugin';

// @amzn/custom
import customAppContextPlugin from '@amzn/custom/dist/plugins/app-context-items-plugin';
import customAppComponentPlugin from '@amzn/custom/dist/plugins/app-component-plugin';
import customRoutesPlugin from '@amzn/custom/dist/plugins/routes-plugin';

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
    baseAppContextItemsPlugin, // @amzn/base-ui
    workflowAppContextItemsPlugin, // @amzn/base-workflow-ui
    envMgmtAppContextItemsPlugin, // @amzn/environment-type-mgmt-ui
    keyPairAppContextItemsPlugin, // @amzn/key-pair-mgmt-ui
    raasAppContextItemsPlugin, // @amzn/base-raas-ui
    customAppContextPlugin, // @amzn/custom
    appContextItemsPlugin, // ./app-context-items-plugin
  ],
  'initialization': [
    baseInitializationPlugin, // @amzn/base-ui
    raasInitializationPlugin, // @amzn/base-raas-ui
    initializationPlugin, // ./initialization-plugin
  ],
  'authentication': [
    baseAuthenticationPlugin, // @amzn/base-ui
  ],
  'app-component': [
    baseAppComponentPlugin, // @amzn/base-ui
    raasAppComponentPlugin, // @amzn/base-raas-ui
    customAppComponentPlugin, // @amzn/custom
  ],
  'menu-items': [
    baseMenuItemsPlugin, // @amzn/base-ui
    workflowMenuItemsPlugin, // @amzn/base-workflow-ui
    envMgmtMenuItemsPlugin, // @amzn/environment-type-mgmt-ui
    keyPairMenuItemsPlugin, // @amzn/key-pair-mgmt-ui
    raasMenuItemsPlugin, // @amzn/base-raas-ui
    menuItemsPlugin, // ./menu-items-plugin
  ],
  'routes': [
    baseRoutesPlugin, // @amzn/base-ui
    workflowRoutesPlugin, // @amzn/base-workflow-ui
    envMgmtRoutesPlugin, // @amzn/environment-type-mgmt-ui
    keyPairRoutesPlugin, // @amzn/key-pair-mgmt-ui
    raasRoutesPlugin, // @amzn/base-raas-ui
    customRoutesPlugin, // @amzn/custom
    routesPlugin, // ./routes-plugin
  ],
  'env-type-management': [
    raasEnvTypeMgmtPlugin, // @amzn/base-raas-ui
  ],
};

function getPlugins(extensionPoint) {
  return extensionPoints[extensionPoint];
}

const registry = {
  getPlugins,
};

export default registry;
