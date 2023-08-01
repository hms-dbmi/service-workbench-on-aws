import React from 'react';
import { Icon, Label, Header, Button } from 'semantic-ui-react';

import { VIEW } from '../../models/environments-sc/advanced/ScEnvView';

// expected props
// - current, as number containing the total visible workspaces
// - total, as number containing all environments
// - isAdmin, as boolean
// - provisionDisabled, as boolean
// - onViewToggle
// - onEnvCreate
export default function EnvsHeader({
  view = VIEW.NORMAL,
  current,
  total,
  isAdmin = false,
  provisionDisabled = false,
  onViewToggle,
  onEnvCreate,
}) {
  return (
    <div className="mb3 flex">
      <Header as="h3" className="color-grey mt1 mb0 flex-auto">
        <Icon name="server" className="align-top" />
        <Header.Content className="left-align">
          Research Workspaces
          {current !== total ? (
            <Label circular>
              {current}/{total}
            </Label>
          ) : (
            <Label circular>{total}</Label>
          )}
        </Header.Content>
      </Header>
      {isAdmin && (
        <Button
          basic
          content={view === VIEW.NORMAL ? VIEW.ADVANCED : VIEW.NORMAL}
          icon="list alternate outline"
          labelPosition="left"
          onClick={onViewToggle}
        />
      )}
      <div>
        <Button
          data-testid="create-workspace"
          color="blue"
          size="medium"
          disabled={provisionDisabled}
          basic
          onClick={onEnvCreate}
        >
          Create Research Workspace
        </Button>
      </div>
    </div>
  );
}
