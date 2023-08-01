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
import { Table, Icon } from 'semantic-ui-react';
import TimeAgo from 'react-timeago';

import { ORDER } from '../../../models/environments-sc/advanced/ScEnvView';

const iconMap = {
  [ORDER.ASC]: 'sort up',
  [ORDER.DESC]: 'sort down',
  none: 'sort',
};

// expected props
// - columns, as array of { key, label }
// - rows, as map of { [column]: value }
// - onSort
export default function CompactTable({ columns, rows, sort, onSort }) {
  const sortedIcon = column => (column === sort.key ? iconMap[sort.order] : iconMap.none);
  function handleSort(key) {
    return () => onSort(key);
  }

  return (
    <Table celled striped compact size="small">
      <Table.Header>
        <Table.Row key="header">
          {columns.map(({ key, label, sortable = true }) =>
            sortable ? (
              <Table.HeaderCell key={`header-${key}`} onClick={handleSort(key)} className="cursor-pointer">
                {label}
                <Icon name={sortedIcon(key)} />
              </Table.HeaderCell>
            ) : (
              <Table.HeaderCell key={`header-${key}`}>{label}</Table.HeaderCell>
            ),
          )}
          <Table.HeaderCell key="header-actions">Actions</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rows.map(row => (
          <Table.Row key={row.id}>
            {columns.map(({ key, type = 'string' }) => (
              <Table.Cell key={`${row.id}-${key}`}>
                {type === 'date' ? <TimeAgo date={row[key]} /> : row[key]}
              </Table.Cell>
            ))}
            <Table.HeaderCell key={`${row.id}-actions`}>{row.actions}</Table.HeaderCell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
