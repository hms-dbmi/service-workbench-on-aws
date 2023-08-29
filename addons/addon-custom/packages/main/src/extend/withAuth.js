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
import { inject, observer } from 'mobx-react';
import { withRouter, Link } from 'react-router-dom';
import { Button } from 'semantic-ui-react';

import Login from '@aws-ee/base-ui/dist/parts/Login';
import _withAuth from '@aws-ee/base-ui/dist/withAuth';
import { gotoFn } from '@aws-ee/base-ui/dist/helpers/routing';
import { branding } from '@aws-ee/base-ui/dist/helpers/settings';

import TermsPage from '../parts/TermsPage';
import Register from '../parts/Register';

/* eslint-disable react/jsx-no-bind */

const noAuthPaths = [
  { path: '/legal', component: TermsPage },
  { path: '/register', component: Register },
  { path: '/register-confirmation', component: Register },
];

function RegisterLogin(enableCustomRegister) {
  function RegisterButton(selfRef) {
    function handleRegister() {
      gotoFn(selfRef)('/register');
    }

    return (
      <>
        {enableCustomRegister && (
          <Button
            data-testid="login"
            type="submit"
            color="blue"
            fluid
            basic
            size="large"
            className="mb2"
            onClick={handleRegister}
          >
            Register
          </Button>
        )}
        <Link to="/legal">Terms of Service</Link>
        <br />
        {branding.main.loginWarning}
      </>
    );
  }
  return <Login AdditionalLoginComponents={RegisterButton} />;
}

class AuthWrapper extends React.Component {
  renderAuthComp(authenticated = false) {
    const Comp = this.props.Comp;
    const props = this.getWrappedCompProps({ authenticated });
    return <Comp {...props} />;
  }

  renderNoAuthComp(Comp) {
    const { location } = this.props;
    const props = this.getWrappedCompProps({ authenticated: false });
    return <Comp {...props} location={location} />;
  }

  enableCustomRegister() {
    const nativeUserPoolConfig = this.props.authenticationProviderPublicConfigsStore.nativeUserPool;
    return _.get(nativeUserPoolConfig, 'customRegister', false);
  }

  render() {
    const { app, location } = this.props;
    if (app.userAuthenticated) {
      return this.renderAuthComp(true);
    }
    const noAuthPath = noAuthPaths.find(o => o.path === location.pathname);
    if (noAuthPath) {
      return this.renderNoAuthComp(noAuthPath.component);
    }
    if (location.pathname !== '/') {
      // If you try to click the login button with a path like /dashboard the page
      // will throw an auth error on the idp side, so we're just going to redirect to
      // the base path if we're not authorized, not registering, and not authenticated.
      gotoFn(this)('/');
    }

    return RegisterLogin(this.enableCustomRegister());
  }

  // private utility methods
  getWrappedCompProps(additionalProps) {
    const props = { ...this.props, ...additionalProps };
    delete props.Comp;
    delete props.loginComp;
    return props;
  }
}

const WrapperComp = inject('app', 'authenticationProviderPublicConfigsStore')(withRouter(observer(AuthWrapper)));

function withAuth(Comp) {
  return function component(props) {
    return <WrapperComp Comp={Comp} {...props} />;
  };
}

export default withAuth;
