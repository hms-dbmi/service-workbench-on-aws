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
import _ from 'lodash';
import { Switch, Redirect, withRouter } from 'react-router-dom';
import { action, decorate, computed } from 'mobx';
import { inject, observer } from 'mobx-react';
import { getEnv } from 'mobx-state-tree';
import { Menu } from 'semantic-ui-react';

import { getRoutes, getMenuItems, getDefaultRouteLocation } from '@aws-ee/base-ui/dist/helpers/plugins-util';
import MainLayout from '@aws-ee/base-ui/dist/parts/MainLayout';

import withAuth from '../extend/withAuth';
import TermsModal from './TermsModel';
import tos from '../../data/terms';

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

  get pendingTOS(){
    const accepted_terms = new Date(_.get(getEnv(this.props.userStore), 'user.accepted_terms', '1900-01-01T01:00:00.000Z'));
    const new_terms = new Date(tos[0].date);
    console.log(accepted_terms, new_terms, new_terms > accepted_terms)
    return new_terms > accepted_terms;
  }

  renderApp() {
    return (
      <>
        <TermsModal // Terms have changed prompt
          title="Updated Terms of Service"
          defaultOpen={this.pendingTOS}
          acceptAction={() => console.log('terms accepted')}
          declineAction={() => console.log('terms declined')}
          logoutOnDecline={true}
          className="mt3"
        />
        <MainLayout
          menuItems={this.getMenuItems()}
          appMenuItems={
            this.pendingTOS 
              ? (<></>)
              : (
                <TermsModal // Clickable Terms menu item
                  trigger={(<Menu.Item>Terms of Service</Menu.Item>)}
                  closeOnDimmerClick={true}
                  className="mt3"
                />
              ) 
          }
        >
          <Switch>
            <Redirect exact from="/" to={this.getDefaultRouteLocation()} />
            {this.getRoutes()}
          </Switch>
        </MainLayout>
      </>
    );
  }

  render() {
    return this.renderApp();
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
const AppComponent = decorate(RegisterApp, { 
  appContext: computed,
  pendingTOS: computed,
  handleLogout: action,
});

export default withAuth(inject('app', 'userStore')(withRouter(observer(AppComponent))));
