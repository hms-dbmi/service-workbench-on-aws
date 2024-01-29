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
import _ from 'lodash';

import withAuth from '@aws-ee/base-ui/dist/withAuth';

import TermsPage from '../parts/TermsPage';
import Register from '../parts/Register';
import PicSureLanding from '../parts/PicSureLanding';

/**
 * Adds your routes to the given routesMap.
 * This function is called last after adding routes to the routesMap from all other installed addons.
 *
 * @param routesMap A Map containing routes. This object is a Map that has route paths as
 * keys and React Component as value.
 *
 * @returns {Promise<*>} Returns a Map with the mapping of routes as keys and their React Component as values
 */
// eslint-disable-next-line no-unused-vars
function registerRoutes(routesMap, { location, appContext }) {
  const routes = new Map([
    ...routesMap,
    ['/landing', withAuth(PicSureLanding)],
    ['/register', withAuth(Register)],
    ['/legal', withAuth(TermsPage)],
  ]);
  return routes;
}

/**
 * Returns default route. By default this method returns the
 * '/dashboard' route as the default route for all non-root users and returns
 * '/users' route for root user.
 * @returns {{search: *, state: *, hash: *, pathname: string}}
 */
function getDefaultRouteLocation({ location, appContext }) {
  const userStore = appContext.userStore;
  const userDefaultLocation = _.get(userStore, 'defaultLocation');

  const defaultLocation = {
    pathname: userDefaultLocation,
    search: location.search, // we want to keep any query parameters
    hash: location.hash,
    state: location.state,
  };

  return defaultLocation;
}

const plugin = { registerRoutes, getDefaultRouteLocation };

export default plugin;
