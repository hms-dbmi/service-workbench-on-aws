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
import _, { mapValues } from 'lodash';
import { Button, Icon, Dropdown, Label, Form, Input } from 'semantic-ui-react';

// expected props
// - mode, as 'or' or 'and'
// - onToggle(value)
function ModeToggle({ mode, onToggle }) {
  const orMode = mode === 'or';
  const off = text => (
    <Button onClick={() => onToggle(text)}>
      <Icon name="circle outline" /> {text.toUpperCase()}
    </Button>
  );
  const on = text => (
    <Button primary>
      <Icon name="check circle" /> {text.toUpperCase()}
    </Button>
  );

  return (
    <Button.Group className="mr1">
      {orMode ? off('and') : on('and')}
      {orMode ? on('or') : off('or')}
    </Button.Group>
  );
}

// expected props
// - fields, as array of { key, icon, label, options }
// - onChange({ fields, mode })
export default function FilterForm({ mode, filters, fields, onFilter }) {
  const [form, setForm] = useState(
    filters.reduce((acc, { key, value, match }) => ({ ...acc, [key]: { value: [...value], match } }), {
      name: { value: [] },
      user: { value: [] },
      project: { value: [] },
      study: { value: [] },
      type: { value: [] },
      configType: { value: [] },
      status: { value: [] },
    }),
  );

  const iconsMap = _.reduce(fields, (acc, { key, icon }) => ({ ...acc, [key]: icon }), {});

  /* eslint-disable no-unused-vars */
  const getFiltersFromForm = formValues =>
    Object.entries(formValues)
      .filter(([key, { value }]) => value.length > 1 || value[0]) // remove empty objects
      .map(([key, { value, match = 'exact' }]) => ({ key, value, icon: iconsMap[key], match })); // populate icons and default match
  /* eslint-disable no-unused-vars */

  function handleChange(key, match) {
    return (e, { value }) => {
      const newForm = { ...form, [key]: { value: Array.isArray(value) ? value : [value], match } };
      onFilter({ filters: getFiltersFromForm(newForm), mode });
      setForm(newForm);
    };
  }

  function updateMode() {
    return newMode => {
      const newForm = mapValues(form, ({ value }) => ({ value: value.slice(0, 1) }));
      onFilter({ filters: getFiltersFromForm(newForm), mode: newMode });
      setForm(newForm);
    };
  }

  return (
    <Form>
      <ModeToggle mode={mode} onToggle={updateMode()} />
      {fields
        .filter(({ filterable = true }) => filterable)
        .map(({ key, icon, label, options }) => {
          if (options) {
            return (
              <Input action key={key} labelPosition="left" className="mr1 mb1">
                <Label>
                  <Icon name={icon} />
                  {label}:
                </Label>
                {mode === 'or' ? (
                  <Dropdown
                    selection
                    search
                    multiple
                    options={options}
                    value={form[key].value}
                    onChange={handleChange(key, 'multiple')}
                  />
                ) : (
                  <Dropdown
                    selection
                    search
                    options={[{ text: <i>none</i>, value: '' }, ...options]}
                    value={form[key].value[0]}
                    onChange={handleChange(key, 'exact')}
                  />
                )}
              </Input>
            );
          }
          return (
            <Input
              key={key}
              labelPosition="left"
              className="mr1 mb1"
              value={form[key].value[0]}
              onChange={handleChange(key, 'partial')}
            >
              <Label>
                <Icon name={icon} />
                {label}:
              </Label>
              <input type="text" style={{ width: 'auto' }} />
            </Input>
          );
        })}
    </Form>
  );
}
