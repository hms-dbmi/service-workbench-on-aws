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
import { decorate, observable, runInAction } from 'mobx';
import { observer, inject } from 'mobx-react';

import { enableBuiltInWorkspaces } from '../../helpers/settings';
import BuiltIntEnvironmentsList from '../environments-builtin/EnvironmentsList';
import ScEnvironmentsList from '../environments-sc/ScEnvironmentsList';
import ScEnvAdvancedList from '../environments-sc/advanced/ScEnvAdvancedList';

import { VIEW } from '../../models/environments-sc/advanced/ScEnvView';

class EnvironmentsList extends React.Component {
  constructor(props) {
    super(props);
    runInAction(() => {
      this.compact = false;
    });
  }

  get viewStore() {
    return this.props.ScEnvView || VIEW.NORMAL;
  }

  render() {
    if (this.viewStore.view === VIEW.ADVANCED) {
      return <ScEnvAdvancedList />;
    }
    return enableBuiltInWorkspaces ? <BuiltIntEnvironmentsList /> : <ScEnvironmentsList />;
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(EnvironmentsList, {
  compact: observable,
});

export default inject('ScEnvView')(observer(EnvironmentsList));
