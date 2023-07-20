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
import { types } from 'mobx-state-tree';
import { cloneDeep } from 'lodash';

const ORDER = { DESC: 'desc', ASC: 'asc' };
const VIEW = { ADVANCED: 'Advanced', NORMAL: 'Normal' };

const Filter = types.model({
  key: types.string,
  value: types.array(types.string),
  icon: types.string,
  match: types.string,
});

const Sort = types.model({
  key: types.string,
  order: types.enumeration('order', [ORDER.DESC, ORDER.ASC]),
});

const ScEnvView = types
  .model('ScEnvView', {
    activeFilters: types.optional(types.array(Filter), []),
    activeMode: types.optional(types.string, 'and'),
    sort: types.optional(Sort, { key: 'createdAt', order: ORDER.DESC }),
    view: types.optional(types.enumeration('view', [VIEW.ADVANCED, VIEW.NORMAL]), VIEW.NORMAL),
  })
  .actions(self => ({
    setFilters(filters = [], mode = 'or') {
      self.activeFilters = cloneDeep(filters);
      self.activeMode = mode;
    },
    setSort(key) {
      if (key === self.sort.key) {
        self.sort.order = self.sort.order === ORDER.ASC ? ORDER.DESC : ORDER.ASC;
      } else {
        self.sort.key = key;
        self.sort.order = ORDER.ASC;
      }
    },
    toggleView() {
      self.view = self.view === VIEW.ADVANCED ? VIEW.NORMAL : VIEW.ADVANCED;
    },
  }))
  .views(self => ({
    get filters() {
      return self.activeFilters;
    },
    get mode() {
      return self.activeMode;
    },
  }));

function registerContextItems(appContext) {
  appContext.ScEnvView = ScEnvView.create({}, appContext);
}

export { ScEnvView, registerContextItems, ORDER, VIEW };
