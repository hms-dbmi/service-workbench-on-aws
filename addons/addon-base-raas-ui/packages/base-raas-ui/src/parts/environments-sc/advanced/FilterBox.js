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
import React, { useState } from 'react';
import { Icon, Accordion, Segment, Divider, Header } from 'semantic-ui-react';

import FilterForm from './FilterForm';
import FilterList from './FilterList';

// expected props
// - mode, as string of either 'or' or 'and'
// - filters, as array of { key, value:[], match, icon }
// - fields, as array of { key, icon, label, options }
// - onNewFilter({ filters, mode })
export default function FilterBox({ mode = 'or', filters = [], fields, onFilter }) {
  const [active, setActive] = useState(false);

  function toggleActive() {
    return () => setActive(!active);
  }

  return (
    <Segment color={active && 'blue'}>
      <Accordion fluid>
        <Accordion.Title index={0} active={active} onClick={toggleActive()}>
          <Icon name="filter" />
          Filters
          <Icon name={active ? 'caret up' : 'caret down'} />
          {!active && <FilterList mode={mode} filters={filters} />}
        </Accordion.Title>
        <Accordion.Content active={active}>
          <FilterForm mode={mode} filters={filters} fields={fields} onFilter={onFilter} />
          <Divider horizontal fitted className="cursor-pointer" onClick={toggleActive()}>
            <Header as="h5">
              <Icon name="caret up" className="mr0" />
              Collapse
            </Header>
          </Divider>
        </Accordion.Content>
      </Accordion>
    </Segment>
  );
}
