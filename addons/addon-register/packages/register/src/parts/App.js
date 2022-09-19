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
import React from 'react';
import { Switch, Redirect, withRouter } from 'react-router-dom';
import { decorate, computed } from 'mobx';
import { inject, observer } from 'mobx-react';
import { getEnv } from 'mobx-state-tree';

import { getRoutes, getMenuItems, getDefaultRouteLocation } from '@aws-ee/base-ui/dist/helpers/plugins-util';
import MainLayout from '@aws-ee/base-ui/dist/parts/MainLayout';

import withAuth from '../extend/withAuth';

// expected props
// - app model (via injection)
// - location (from react router)
class RegisterApp extends React.Component {
  get appContext() {
    return getEnv(this.props.app) || {};
  }

  getRoutes() {
    const { location } = this.props;
    const appContext = this.appContext;
    return getRoutes({ location, appContext });
  }

  getMenuItems() {
    const { location } = this.props;
    const appContext = this.appContext;
    return getMenuItems({ location, appContext });
  }

  getDefaultRouteLocation() {
    // See https://reacttraining.com/react-router/web/api/withRouter
    const { location } = this.props;
    const appContext = this.appContext;

    return getDefaultRouteLocation({ location, appContext });
  }

  renderApp() {
    const defaultLocation = this.getDefaultRouteLocation();
    return (
      <MainLayout menuItems={this.getMenuItems()}>
        <Switch>
          <Redirect exact from="/" to={defaultLocation} />
          {this.getRoutes()}
        </Switch>
      </MainLayout>
    );
  }

  render() {
    return this.renderApp();
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
const AppComponent = decorate(RegisterApp, { appContext: computed });

export default withAuth(inject('app')(withRouter(observer(AppComponent))));
