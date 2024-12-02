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
import { Container, Segment, Header, Icon, Grid, Input, Dropdown } from 'semantic-ui-react';

import { gotoFn } from '@aws-ee/base-ui/dist/helpers/routing';
import { swallowError } from '@aws-ee/base-ui/dist/helpers/utils';
import {
  isStoreLoading,
  isStoreEmpty,
  isStoreNotEmpty,
  isStoreError,
  isStoreReady,
} from '@aws-ee/base-ui/dist/models/BaseStore';
import ErrorBox from '@aws-ee/base-ui/dist/parts/helpers/ErrorBox';
import ProgressPlaceHolder from '@aws-ee/base-ui/dist/parts/helpers/BasicProgressPlaceholder';

import ScEnvironmentCard from './ScEnvironmentCard';
import ScEnvironmentsFilterButtons from './parts/ScEnvironmentsFilterButtons';
import EnvsHeader from './ScEnvsHeader';
import Paginate from '../helpers/Paginate';
import { filterNames } from '../../models/environments-sc/ScEnvironmentsStore';

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
      this.statusFilter = filterNames.ALL;
      this.provisionDisabled = false;
      this.searchType = 'any';
      this.search = '';
      this.page = 1;
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

  handleViewToggle() {
    return () => runInAction(() => this.viewStore.toggleView());
  }

  handleSearchAndFilter({ search, searchType, status }) {
    runInAction(() => {
      this.page = 1; // Reset page number on search/filter change
      this.search = search !== undefined ? search : this.search;
      this.searchType = searchType || this.searchType;
      this.statusFilter = status || this.statusFilter;
    });
  }

  handlePaginationChange() {
    return number =>
      runInAction(() => {
        this.page = number;
        window.scrollTo(0, 0);
      });
  }

  handlePerPageChange() {
    return number =>
      runInAction(() => {
        this.page = 1;
        this.viewStore.setPerPage(number);
      });
  }

  render() {
    const store = this.envsStore;
    let content = null;
    let total = 0;
    let current = 0;

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
      const { paginatedEnvList, filteredEnvsCount } = this.getPaginatedEnvs();
      current = filteredEnvsCount;
      total = store.total;
      content = this.renderMain(paginatedEnvList, filteredEnvsCount);
    }

    return (
      <Container className="mt3 animated fadeIn">
        {this.provisionDisabled && this.renderMissingAppStreamConfig()}
        <EnvsHeader
          current={current}
          total={total}
          isAdmin={this.isAdmin}
          provisionDisabled={this.provisionDisabled}
          onViewToggle={this.handleViewToggle()}
          onEnvCreate={this.handleCreateEnvironment}
        />
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

  getPaginatedEnvs() {
    const searchFilter = this.searchFilterMethod();
    const statusFilter = this.statusFilterMethod();
    const filteredEnvs = _.filter(this.envsStore.list, env => searchFilter(env) && statusFilter(env));
    const orderedEnvs = _.orderBy(filteredEnvs, ['createdAt', 'name'], ['desc', 'asc']);

    const firstIndex = (this.page - 1) * this.viewStore.perPage;
    const lastIndex = Math.min(this.page * this.viewStore.perPage, orderedEnvs.length);
    return {
      paginatedEnvList: orderedEnvs.slice(firstIndex, lastIndex),
      filteredEnvsCount: filteredEnvs.length,
    };
  }

  statusFilterMethod() {
    const matchStatus = (...A) => env => _.find(A, a => a.includes(env.status));
    const filterMap = {
      [filterNames.ALL]: () => true,
      [filterNames.AVAILABLE]: matchStatus('COMPLETED', 'TAINTED'),
      [filterNames.STOPPED]: matchStatus('STOPPED'),
      [filterNames.PENDING]: matchStatus('PENDING', 'TERMINATING', 'STARTING', 'STOPPING'),
      [filterNames.ERRORED]: matchStatus('FAILED', 'TERMINATING_FAILED', 'STARTING_FAILED', 'STOPPING_FAILED'),
      [filterNames.TERMINATED]: matchStatus('TERMINATED'),
    };
    return filterMap[this.statusFilter];
  }

  searchFilterMethod() {
    if (!this.search) {
      return () => true;
    }

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
              env.id,
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
    return searchMap[this.searchType];
  }

  renderMain(paginatedEnvList, filteredEnvsCount) {
    const isEmpty = _.isEmpty(paginatedEnvList);
    const lastIndex = paginatedEnvList.length - 1;

    return (
      <div data-testid="workspaces">
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
                    onChange={(e, data) => this.handleSearchAndFilter({ searchType: data.value }, e)}
                  />
                }
                placeholder="Search"
                icon="search"
                iconPosition="left"
                onChange={_.debounce((e, data) => this.handleSearchAndFilter({ search: data.value }, e), 500)}
              />
            </Grid.Column>
            <Grid.Column width={10}>
              <ScEnvironmentsFilterButtons
                selectedFilter={this.statusFilter}
                onSelectedFilter={name => this.handleSearchAndFilter({ status: name })}
              />
            </Grid.Column>
          </Grid.Row>
        </Grid>
        <Paginate
          entriesPerPage={this.viewStore.perPage}
          totalEntries={filteredEnvsCount}
          currentPage={this.page}
          onPageChange={this.handlePaginationChange()}
          onPerPageChange={this.handlePerPageChange()}
        >
          {!isEmpty &&
            _.map(paginatedEnvList, (env, index) => (
              <Segment clearing key={env.id} className={index === lastIndex ? 'p3' : 'p3 mb2'}>
                <ScEnvironmentCard scEnvironment={env} />
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
        </Paginate>
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
  envsStore: computed,
  envTypesStore: computed,
  viewStore: computed,
  isAdmin: computed,

  handleCreateEnvironment: action,
  handleViewToggle: action,
  handlePaginationChange: action,
  handlePerPageChange: action,
  handleSearchAndFilter: action,

  provisionDisabled: observable,
  statusFilter: observable,
  search: observable,
  searchType: observable,
  page: observable,
});

export default inject(
  'ScEnvView',
  'scEnvironmentsStore',
  'projectsStore',
  'envTypesStore',
  'userDisplayName',
  'userStore',
)(withRouter(observer(ScEnvironmentsList)));
