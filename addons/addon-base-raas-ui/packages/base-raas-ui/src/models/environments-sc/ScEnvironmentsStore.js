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
import { values } from 'mobx';
import { getEnv, types } from 'mobx-state-tree';
import { updateMap } from '@aws-ee/base-ui/dist/helpers/utils';
import { BaseStore } from '@aws-ee/base-ui/dist/models/BaseStore';

import {
  getScEnvironments,
  createScEnvironment,
  deleteScEnvironment,
  startScEnvironment,
  stopScEnvironment,
  updateScEnvironmentCidrs,
  updateScEnvironmentLock,
  deleteEgressStore,
} from '../../helpers/api';

import { ScEnvironment } from './ScEnvironment';
import { ScEnvironmentStore } from './ScEnvironmentStore';
import { ScEnvConnectionStore } from './ScEnvConnectionStore';
import { ScEnvironmentEgressStoreDetailStore } from './ScEnvironmentEgressStoreDetailStore';
import { enableEgressStore } from '../../helpers/settings';

const filterNames = {
  ALL: 'all',
  AVAILABLE: 'available',
  STOPPED: 'stopped',
  PENDING: 'pending',
  ERRORED: 'errored',
  TERMINATED: 'terminated',
};

const API_LIMIT = 300;

// ==================================================================
// ScEnvironmentsStore
// ==================================================================
const ScEnvironmentsStore = BaseStore.named('ScEnvironmentsStore')
  .props({
    environments: types.optional(types.map(ScEnvironment), {}),
    environmentStores: types.optional(types.map(ScEnvironmentStore), {}),
    connectionStores: types.optional(types.map(ScEnvConnectionStore), {}),
    egressStoreDetailStore: types.optional(types.map(ScEnvironmentEgressStoreDetailStore), {}),
    tickPeriod: 30 * 1000, // 30 seconds
  })

  .actions(self => {
    // save the base implementation of cleanup
    const superCleanup = self.cleanup;

    return {
      async doLoad() {
        let offsetId;
        const params = { // Lock initial request parameters for this loop - only the offsetId can change.
          limit: API_LIMIT,
          since: self.since
        };
        do {
          const { result = [], offsetId: newOffsetId } = await getScEnvironments({ ...params, offsetId });

          offsetId = newOffsetId;
          self.runInAction(() => {
            updateMap(self.environments, result, (existing, newItem) => { existing.setScEnvironment(newItem); });

            // Remember last updated record's day, to get newer ones on next load loop instead of refreshing everything
            const lastUpdated = _.last(result.map(env => env.updatedAt).filter(x => x).sort());
            self.since = (!self.since || (self.since && lastUpdated > self.since)) ? lastUpdated : self.since;
          });
        } while (!!offsetId);
      },

      addScEnvironment(rawEnvironment) {
        const id = rawEnvironment.id;
        const previous = self.environments.get(id);

        if (!previous) {
          self.environments.put(rawEnvironment);
        } else {
          previous.setScEnvironment(rawEnvironment);
        }
      },

      async updateScEnvironmentCidrs(envId, updateRequest) {
        const result = await updateScEnvironmentCidrs(envId, updateRequest);
        const env = self.getScEnvironment(envId);
        env.setScEnvironment(result);
        return env;
      },

      async toggleScEnvironmentLock(envId) {
        const currEnv = self.getScEnvironment(envId);
        const updateReq = { rev: currEnv.rev, terminationLocked: !currEnv.terminationLocked };
        const result = await updateScEnvironmentLock(envId, updateReq);
        const env = self.getScEnvironment(envId);
        env.setScEnvironment(result);
        return env;
      },

      async createScEnvironment(environment) {
        const result = await createScEnvironment(environment);
        self.addScEnvironment(result);
        return self.getScEnvironment(result.id);
      },

      async terminateScEnvironment(id) {
        const env = self.getScEnvironment(id);
        if (!env) return;
        env.setStatus('TERMINATING');
        if (enableEgressStore) {
          await deleteEgressStore(id);
        }
        await deleteScEnvironment(id);
      },

      async startScEnvironment(id) {
        const env = self.getScEnvironment(id);
        if (!env) return;
        env.setStatus('STARTING');
        await startScEnvironment(id);
      },

      async stopScEnvironment(id) {
        const env = self.getScEnvironment(id);
        if (!env) return;
        env.setStatus('STOPPING');
        await stopScEnvironment(id);
      },

      getScEnvironmentStore(envId) {
        let entry = self.environmentStores.get(envId);
        if (!entry) {
          // Lazily create the store
          self.environmentStores.set(envId, ScEnvironmentStore.create({ envId }));
          entry = self.environmentStores.get(envId);
        }

        return entry;
      },

      getScEnvConnectionStore(envId) {
        let entry = self.connectionStores.get(envId);
        if (!entry) {
          // Lazily create the store
          self.connectionStores.set(envId, ScEnvConnectionStore.create({ envId }));
          entry = self.connectionStores.get(envId);
        }

        return entry;
      },

      getScEnvironmentEgressStoreDetailStore(envId) {
        let entry = self.egressStoreDetailStore.get(envId);
        if (!entry) {
          // Lazily create the store
          self.egressStoreDetailStore.set(envId, ScEnvironmentEgressStoreDetailStore.create({ envId }));
          entry = self.egressStoreDetailStore.get(envId);
        }
        return entry;
      },

      cleanup: () => {
        self.environments.clear();
        self.environmentStores.clear();
        self.connectionStores.clear();
        self.egressStoreDetailStore.clear();
        superCleanup();
      },
    };
  })

  .views(self => ({
    get empty() {
      return self.environments.size === 0;
    },

    get total() {
      return self.environments.size;
    },

    get list() {
      return values(self.environments);
    },

    getScEnvironment(id) {
      return self.environments.get(id);
    },

    canChangeState(id) {
      const outputs = self.environments.get(id).outputs;
      let result = false;
      outputs.forEach(output => {
        if (output.OutputKey === 'Ec2WorkspaceInstanceId' || output.OutputKey === 'NotebookInstanceName') {
          result = true;
        }
      });
      return result;
    },

    get user() {
      return getEnv(self).userStore.user;
    },
  }));

function registerContextItems(appContext) {
  appContext.scEnvironmentsStore = ScEnvironmentsStore.create({}, appContext);
}

export { ScEnvironmentsStore, registerContextItems, filterNames, API_LIMIT };
