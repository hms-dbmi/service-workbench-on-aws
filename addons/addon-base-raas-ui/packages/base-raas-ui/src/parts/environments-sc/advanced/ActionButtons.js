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
import { Button, Modal } from 'semantic-ui-react';

// expected props
// - id
// - terminationLocked, as boolean
// - enabled, as { [action]: boolean }
// - onAction(action, id)
export default function ActionButtons({ id, pending = false, terminationLocked, can, onAction }) {
  const [loading, setLoading] = useState(pending);

  function handleAction(action, value) {
    return async () => {
      setLoading(true);
      await onAction(action, value);
      setLoading(false);
    };
  }

  return (
    <Button.Group size="mini" className="m1">
      <Button icon="eye" onClick={handleAction('view', `/workspaces/id/${id}`)} />
      {can.start && <Button icon="play circle" color="green" loading={loading} onClick={handleAction('start', id)} />}
      {can.stop && <Button icon="stop circle" color="orange" loading={loading} onClick={handleAction('stop', id)} />}
      {can.terminate &&
        (terminationLocked ? (
          <Button disabled icon="trash" color="red" loading={loading} />
        ) : (
          <Modal
            trigger={<Button icon="trash" color="red" loading={loading} />}
            header="Are you sure?"
            content="This action can not be reverted."
            actions={[
              'Cancel',
              {
                key: 'terminate',
                content: 'Terminate',
                negative: true,
                onClick: handleAction('terminate', id),
              },
            ]}
            size="mini"
          />
        ))}
      {can.lock && (
        <Button
          icon={terminationLocked ? 'unlock' : 'lock'}
          color="teal"
          loading={loading}
          onClick={handleAction('toggleLock', id)}
        />
      )}
    </Button.Group>
  );
}
