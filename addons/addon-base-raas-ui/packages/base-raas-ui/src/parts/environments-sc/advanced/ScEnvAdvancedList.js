import React from 'react';
import _ from 'lodash';
import { decorate, computed, action, runInAction } from 'mobx';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Container, Icon, Segment, Header } from 'semantic-ui-react';

import { swallowError } from '@aws-ee/base-ui/dist/helpers/utils';
import { gotoFn } from '@aws-ee/base-ui/dist/helpers/routing';
import {
  isStoreLoading,
  isStoreEmpty,
  isStoreNotEmpty,
  isStoreError,
  isStoreReady,
} from '@aws-ee/base-ui/dist/models/BaseStore';
import ErrorBox from '@aws-ee/base-ui/dist/parts/helpers/ErrorBox';
import ProgressPlaceHolder from '@aws-ee/base-ui/dist/parts/helpers/BasicProgressPlaceholder';

import CompactTable from './CompactTable';
import FilterBox from './FilterBox';
import ActionButtons from './ActionButtons';
import EnvsHeader from '../ScEnvsHeader';

const statusMap = [
  { name: 'AVAILABLE', list: ['COMPLETED', 'TAINTED'] },
  { name: 'STOPPED', list: ['STOPPED'] },
  { name: 'PENDING', list: ['PENDING', 'TERMINATING', 'STARTING', 'STOPPING'] },
  { name: 'ERRORED', list: ['FAILED', 'TERMINATING_FAILED', 'STARTING_FAILED', 'STOPPING_FAILED'] },
  { name: 'TERMINATED', list: ['TERMINATED'] },
];

class ScEnvAdvancedList extends React.Component {
  constructor(props) {
    super(props);
    runInAction(() => {
      this.goto = gotoFn(this);
    });
  }

  componentDidMount() {
    window.scrollTo(0, 0);
    swallowError(this.envsStore.load());
    this.envsStore.startHeartbeat();

    if (!isStoreReady(this.envTypesStore)) {
      swallowError(this.envTypesStore.load());
    }
  }

  get envTypesStore() {
    return this.props.envTypesStore;
  }

  get envsStore() {
    return this.props.scEnvironmentsStore;
  }

  get userDisplayName() {
    return this.props.userDisplayName;
  }

  get viewStore() {
    return this.props.ScEnvView;
  }

  userName(env) {
    return this.props.userDisplayName.getLongDisplayName({ uid: env.createdBy });
  }

  workspaceName(env) {
    return this.props.envTypesStore.getEnvType(env.envTypeId)?.name;
  }

  statusName(envStatus) {
    return _.find(statusMap, ({ list }) => list.includes(envStatus))?.name || 'UNKNOWN';
  }

  canDoAction(env, actionType) {
    return this.envsStore.canChangeState(env.id) && env.state[actionType];
  }

  getEnvFields(envs) {
    const optionSets = envs.reduce(
      (opts, env) => {
        opts.user.add(this.userName(env));
        opts.project.add(env.projectId);
        env.studyIds.forEach(study => opts.study.add(study));
        opts.type.add(this.workspaceName(env) || env.envTypeId);
        opts.configType.add(env.envTypeConfigId);
        return opts;
      },
      {
        user: new Set(),
        project: new Set(),
        study: new Set(),
        type: new Set(),
        configType: new Set(),
      },
    );
    const options = _.mapValues(optionSets, set => Array.from(set).map(option => ({ text: option, value: option })));
    const statusOptions = statusMap.map(({ name }) => ({ text: name, value: name }));

    const fields = [
      { key: 'name', label: 'Name', icon: 'info' },
      { key: 'user', label: 'Created By', icon: 'user', options: options.user },
      { key: 'createdAt', label: 'Created At', icon: 'calendar alternate outline', type: 'date', filterable: false },
      { key: 'project', label: 'Project', icon: 'suitcase', options: options.project },
      { key: 'study', label: 'Studies', icon: 'database', options: options.study, sortable: false },
      { key: 'type', label: 'Workspace Type', icon: 'laptop', options: options.type },
      { key: 'configType', label: 'Workspace Config', icon: 'setting', options: options.configType },
      { key: 'status', label: 'Status', icon: 'cloud', options: statusOptions },
    ];
    return fields;
  }

  getEnvs(envs, filters, sort) {
    let envRow = _(envs).map(env => ({
      id: env.id,
      name: env.name,
      user: this.userName(env),
      createdAt: env.createdAt,
      project: env.projectId,
      study: env.studyIds?.join(', ') || 'none',
      type: this.workspaceName(env) || env.envTypeId,
      configType: env.envTypeConfigId,
      status: this.statusName(env.status),
      actions: (
        <ActionButtons
          id={env.id}
          pending={this.statusName(env.status) === 'PENDING'}
          terminationLocked={env.terminationLocked}
          can={{
            start: this.canDoAction(env, 'canStart'),
            stop: this.canDoAction(env, 'canStop'),
            terminate: this.canDoAction(env, 'canTerminate'),
            lock: this.canDoAction(env, 'canTerminate'), // only allow lock/unlock if the instance can be terminated
          }}
          onAction={this.handleAction()}
        />
      ),
    }));

    if (filters.length > 0) {
      const or = (list, predicate) => _.find(list, predicate);
      const and = (list, predicate) => _.reduce(list, (acc, value) => acc && predicate(value), true);
      const listMatcher = (A, b) => _.find(A, a => a === b);
      const regexMatcher = (a, b) => new RegExp(_.escapeRegExp(a), 'i').test(b);

      envRow = envRow.filter(env => {
        const operator = this.viewStore.mode === 'or' ? or : and;
        return operator(filters, ({ key, value, match }) => {
          const matcher = match === 'partial' ? regexMatcher : listMatcher;
          return matcher(value, env[key]);
        });
      });
    }

    return envRow.orderBy(sort.key, sort.order).value();
  }

  handleAction() {
    const actionMap = {
      start: this.envsStore.startScEnvironment,
      stop: this.envsStore.stopScEnvironment,
      terminate: this.envsStore.terminateScEnvironment,
      toggleLock: this.envsStore.toggleScEnvironmentLock,
      view: this.goto,
    };
    return (actionType, value) => actionMap[actionType](value);
  }

  handleFilter() {
    return ({ filters, mode }) => runInAction(() => this.viewStore.setFilters(filters, mode));
  }

  handleSort() {
    return key => runInAction(() => this.viewStore.setSort(key));
  }

  handleViewToggle() {
    return () => runInAction(() => this.viewStore.toggleView());
  }

  handleCreateEnvironment() {
    return event => {
      event.preventDefault();
      event.stopPropagation();

      this.goto(`/workspaces/create`);
    };
  }

  render() {
    let content = null;

    if (isStoreError(this.envsStore)) {
      content = <ErrorBox error={this.envsStore.error} className="p0" />;
    } else if (isStoreLoading(this.envsStore)) {
      content = <ProgressPlaceHolder segmentCount={3} />;
    } else if (isStoreEmpty(this.envsStore)) {
      content = (
        <Segment data-testid="workspaces" placeholder>
          <Header icon className="color-grey">
            <Icon name="server" />
            No research workspaces
            <Header.Subheader>To create a research workspace, click Create Research Workspace.</Header.Subheader>
          </Header>
        </Segment>
      );
    } else if (isStoreNotEmpty(this.envsStore)) {
      const fields = this.getEnvFields(this.envsStore.list);
      const tableColumns = fields.map(column => _.pick(column, ['key', 'label', 'sortable', 'type']));
      const tableRows = this.getEnvs(this.envsStore.list, this.viewStore.filters, this.viewStore.sort);

      content = (
        <>
          <EnvsHeader
            current={tableRows.length}
            total={this.envsStore.total}
            view={this.viewStore.view}
            isAdmin // We only get to this view if we're an admin, so this must be true
            onViewToggle={this.handleViewToggle()}
            onEnvCreate={this.handleCreateEnvironment()}
          />
          <FilterBox
            mode={this.viewStore.mode}
            filters={this.viewStore.filters}
            fields={fields}
            onFilter={this.handleFilter()}
          />
          <CompactTable sort={this.viewStore.sort} columns={tableColumns} rows={tableRows} onSort={this.handleSort()} />
        </>
      );
    }

    return <Container className="mt3 animated fadeIn">{content}</Container>;
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(ScEnvAdvancedList, {
  viewStore: computed,
  envsStore: computed,
  envTypesStore: computed,
  userDisplayName: computed,
  handleFilter: action,
  handleSort: action,
  handleViewToggle: action,
  handleCreateEnvironment: action,
});

export default inject(
  'ScEnvView',
  'scEnvironmentsStore',
  'userDisplayName',
  'envTypesStore',
)(withRouter(observer(ScEnvAdvancedList)));
