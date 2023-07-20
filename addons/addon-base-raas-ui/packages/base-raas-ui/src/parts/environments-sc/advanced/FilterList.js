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
import { Icon, Label } from 'semantic-ui-react';

// expected props
// - key
// - value
// - icon
function Filter({ value, icon }) {
  const filters = value.join(', ');

  if (!filters) return <></>;

  return (
    <Label basic>
      <Icon name={icon} /> {filters}
    </Label>
  );
}

// expected props
// - mode, as 'or' or 'and'
// - filters, as array of { key, value, icon }
export default function FilterList({ mode, filters }) {
  if (filters.length === 0) return <></>;

  return (
    <span className="ml2">
      <Label basic>Mode: {mode.toUpperCase()}</Label>
      {filters.map(({ key, value, icon }) => (
        <Filter key={key} value={value} icon={icon} />
      ))}
    </span>
  );
}
