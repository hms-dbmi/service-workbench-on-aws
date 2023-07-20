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
import { decorate, computed, action, observable, runInAction } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Container, Segment, Header, Icon, Form, Grid, Input, Dropdown } from 'semantic-ui-react';

import { gotoFn } from '@aws-ee/base-ui/dist/helpers/routing';
import { swallowError, storage } from '@aws-ee/base-ui/dist/helpers/utils';
import storageKeys from '@aws-ee/base-ui/dist/models/constants/local-storage-keys';
import {
  isStoreLoading,
  isStoreEmpty,
  isStoreNotEmpty,
  isStoreError,
  isStoreReady,
} from '@aws-ee/base-ui/dist/models/BaseStore';
import ErrorBox from '@aws-ee/base-ui/dist/parts/helpers/ErrorBox';
import ProgressPlaceHolder from '@aws-ee/base-ui/dist/parts/helpers/BasicProgressPlaceholder';

import { filterNames } from '../../models/environments-sc/ScEnvironmentsStore';
import ScEnvironmentCard from './ScEnvironmentCard';
import ScEnvironmentsFilterButtons from './parts/ScEnvironmentsFilterButtons';
import EnvsHeader from './ScEnvsHeader';

const envOptions = [
  { key: 'any', text: 'Any Attribute', value: 'any' },
  { key: 'meta', text: 'Name or Description', value: 'meta' },
  { key: 'user', text: 'User', value: 'user' },
  { key: 'project', text: 'Project', value: 'project' },
  { key: 'type', text: 'Workspace Type', value: 'type' },
  { key: 'config-type', text: 'Configuration Name', value: 'configType' },
  { key: 'study', text: 'Study', value: 'study' },
];

// expected props
// - scEnvironmentsStore (via injection)
// - envTypesStore (via injection)
// - projectsStore (via injection)
class ScEnvironmentsList extends React.Component {
  constructor(props) {
    super(props);
    runInAction(() => {
      const key = storageKeys.workspacesFilterName;
      const name = storage.getItem(key) || filterNames.ALL;
      storage.setItem(key, name);
      this.selectedFilter = name;
      this.provisionDisabled = false;
      this.searchType = 'any';
      this.search = '';
    });
  }

  componentDidMount() {
    window.scrollTo(0, 0);
    const store = this.envsStore;
    swallowError(store.load());
    store.startHeartbeat();

    const typesStore = this.envTypesStore;
    if (!isStoreReady(typesStore)) {
      swallowError(typesStore.load());
    }
  }

  componentWillUnmount() {
    const store = this.envsStore;
    store.stopHeartbeat();
  }

  get isAppStreamEnabled() {
    return process.env.REACT_APP_IS_APP_STREAM_ENABLED === 'true';
  }

  get envTypesStore() {
    return this.props.envTypesStore;
  }

  get envsStore() {
    return this.props.scEnvironmentsStore;
  }

  get viewStore() {
    return this.props.ScEnvView;
  }

  get isAdmin() {
    return this.props.userStore.user.isAdmin;
  }

  getProjects() {
    const store = this.getProjectsStore();
    return store.list;
  }

  getProjectsStore() {
    const store = this.props.projectsStore;
    store.load();
    return store;
  }

  handleCreateEnvironment = event => {
    event.preventDefault();
    event.stopPropagation();

    const goto = gotoFn(this);
    goto(`/workspaces/create`);
  };

  handleSelectedFilter = name => {
    this.selectedFilter = name;
    const key = storageKeys.workspacesFilterName;
    storage.setItem(key, name);
  };

  handleViewToggle() {
    return () => runInAction(() => this.viewStore.toggleView());
  }

  render() {
    const store = this.envsStore;
    let content = null;
    let list = [];
    const projects = this.getProjects();
    const appStreamProjectIds = _.map(
      _.filter(projects, proj => proj.isAppStreamConfigured),
      'id',
    );

    runInAction(() => {
      if (this.isAppStreamEnabled && _.isEmpty(appStreamProjectIds)) this.provisionDisabled = true;
    });

    if (isStoreError(store)) {
      content = <ErrorBox error={store.error} className="p0" />;
    } else if (isStoreLoading(store)) {
      content = <ProgressPlaceHolder segmentCount={3} />;
    } else if (isStoreEmpty(store)) {
      content = this.renderEmpty();
    } else if (isStoreNotEmpty(store)) {
      list = this.searchAndFilter();
      content = (
        <>
          <EnvsHeader
            current={list.length}
            total={store.total}
            isAdmin={this.isAdmin}
            provisionDisabled={this.provisionDisabled}
            onViewToggle={this.handleViewToggle()}
            onEnvCreate={this.handleCreateEnvironment}
          />
          {this.renderMain(list)}
        </>
      );
    }

    return (
      <Container className="mt3 animated fadeIn">
        {this.provisionDisabled && this.renderMissingAppStreamConfig()}
        {content}
      </Container>
    );
  }

  renderMissingAppStreamConfig() {
    return (
      <>
        <Segment placeholder className="mt2">
          <Header icon className="color-grey">
            <Icon name="lock" />
            Missing association with AppStream projects
            <Header.Subheader>
              Since your projects are not associated to an AppStream-configured account, creating a new workspace is
              disabled. Please contact your administrator.
            </Header.Subheader>
          </Header>
        </Segment>
      </>
    );
  }

  searchAndFilter() {
    const list = this.envsStore.filtered(this.selectedFilter);
    if (_.isEmpty(this.search)) return list;
    const searchString = `(${_.escapeRegExp(this.search).replace(' or ', '|')})`;
    const exp = new RegExp(searchString, 'i');

    const userName = env => this.props.userDisplayName.getDisplayName({ uid: env.createdBy });
    const workspaceName = env => this.props.envTypesStore.getEnvType(env.envTypeId)?.name;
    const configName = env =>
      this.props.envTypesStore.getEnvTypeConfigsStore(env.envTypeId).getEnvTypeConfig(env.envTypeConfigId)?.name;

    const searchMap = {
      any: env =>
        !_.isEmpty(
          _.find(
            [
              env.name,
              env.description,
              env.projectId,
              env.studyIds.join(', '),
              userName(env),
              workspaceName(env),
              configName(env),
            ],
            val => exp.test(val),
          ),
        ),
      meta: env => exp.test(env.name) || exp.test(env.description),
      user: env => exp.test(userName(env)),
      project: env => exp.test(env.projectId),
      type: env => exp.test(workspaceName(env)),
      configType: env => exp.test(configName(env)),
      study: env => exp.test(env.studyIds.join(', ')),
    };

    return _.filter(list, searchMap[this.searchType]);
  }

  renderMain(list) {
    const isEmpty = _.isEmpty(list);

    return (
      <div data-testid="workspaces">
        <Form>
          <Grid columns={2} stackable className="mt2">
            <Grid.Row stretched>
              <Grid.Column width={6}>
                <Input
                  fluid
                  action={
                    <Dropdown
                      button
                      basic
                      floating
                      defaultValue="any"
                      options={envOptions}
                      onChange={(e, data) =>
                        runInAction(() => {
                          this.searchType = data.value;
                        })
                      }
                    />
                  }
                  placeholder="Search"
                  icon="search"
                  iconPosition="left"
                  onChange={(e, data) =>
                    runInAction(() => {
                      this.search = data.value;
                    })
                  }
                />
              </Grid.Column>
              <Grid.Column width={10}>
                <ScEnvironmentsFilterButtons
                  selectedFilter={this.selectedFilter}
                  onSelectedFilter={this.handleSelectedFilter}
                />
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Form>
        {!isEmpty &&
          _.map(list, item => (
            <Segment className="p3 mb4" clearing key={item.id}>
              <ScEnvironmentCard scEnvironment={item} />
            </Segment>
          ))}
        {isEmpty && (
          <Segment placeholder>
            <Header icon className="color-grey">
              <Icon name="server" />
              No research workspaces matching the selected filter or search.
              <Header.Subheader>Select &apos;All&apos; to view all the workspaces</Header.Subheader>
            </Header>
          </Segment>
        )}
      </div>
    );
  }

  renderEmpty() {
    return (
      <Segment data-testid="workspaces" placeholder>
        <Header icon className="color-grey">
          <Icon name="server" />
          No research workspaces
          <Header.Subheader>To create a research workspace, click Create Research Workspace.</Header.Subheader>
        </Header>
      </Segment>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(ScEnvironmentsList, {
  selectedFilter: observable,
  provisionDisabled: observable,
  envsStore: computed,
  envTypesStore: computed,
  viewStore: computed,
  isAdmin: computed,
  handleCreateEnvironment: action,
  handleSelectedFilter: action,
  handleViewToggle: action,
  search: observable,
});

export default inject(
  'ScEnvView',
  'scEnvironmentsStore',
  'projectsStore',
  'envTypesStore',
  'userDisplayName',
  'envTypesStore',
  'userStore',
)(withRouter(observer(ScEnvironmentsList)));
