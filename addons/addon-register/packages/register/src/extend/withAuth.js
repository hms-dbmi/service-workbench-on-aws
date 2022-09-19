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
import { inject, observer } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Button } from 'semantic-ui-react';

import Login from '@aws-ee/base-ui/dist/parts/Login';
import _withAuth from '@aws-ee/base-ui/dist/withAuth';
import { gotoFn } from '@aws-ee/base-ui/dist/helpers/routing';

import Register from '../parts/Register';

function RegisterLogin() {
  function RegisterButton(selfRef) {
    function handleRegister() {
      gotoFn(selfRef)('/register');
    }

    return (
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
    );
  }
  return <Login AdditionalLoginComponents={RegisterButton} />;
}

class AuthWrapper extends React.Component {
  renderComp(authenticated = false) {
    const Comp = this.props.Comp;
    const props = this.getWrappedCompProps({ authenticated });
    return <Comp {...props} />;
  }

  registerComp() {
    const { location } = this.props;
    const props = this.getWrappedCompProps({ authenticated: false });
    return <Register {...props} location={location} />;
  }

  render() {
    const { app, location } = this.props;
    if (app.userAuthenticated) {
      return this.renderComp(true);
    }
    if (['/register', '/register-confirmation'].includes(location.pathname)) {
      return this.registerComp();
    }
    if (location.pathname !== '/') {
      // If you try to click the login button with a path like /dashboard the page
      // will throw an auth error on the idp side, so we're just going to redirect to
      // the base path if we're not authorized, not registering, and not authenticated.
      gotoFn(this)('/');
    }

    return RegisterLogin();
  }

  // private utility methods
  getWrappedCompProps(additionalProps) {
    const props = { ...this.props, ...additionalProps };
    delete props.Comp;
    delete props.loginComp;
    return props;
  }
}

const WrapperComp = inject('app')(withRouter(observer(AuthWrapper)));

function withAuth(Comp) {
  return function component(props) {
    return <WrapperComp Comp={Comp} {...props} />;
  };
}

export default withAuth;
