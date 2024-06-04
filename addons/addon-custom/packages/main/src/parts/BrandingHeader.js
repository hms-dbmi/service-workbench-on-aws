import React from 'react';
import { inject } from 'mobx-react';

import { Grid, Image, Header, Message } from 'semantic-ui-react';

import { renderHTML } from '../helpers/utils';

export function BrandingHeader({ copy, assets, picsureBoxes = true, authenticationProviderPublicConfigsStore }) {
  const maxImageWidth = { height: 'auto', maxWidth: '350px', margin: 'auto' };
  const loginBlocking = authenticationProviderPublicConfigsStore.loginBlocking || false;

  return (
    <>
      <Grid
        verticalAlign="middle"
        className="animated fadeIn"
        style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.2em' }}
      >
        <Grid.Row columns={1}>
          <Grid.Column className="bodyText">
            <Image fluid src={assets.images.registerLogo} style={maxImageWidth} />
            <div className="center">
              <Header as="h2" textAlign="center" className="header">
                {copy.title}
              </Header>
              {loginBlocking && (
                <div className="mb2">
                  <Message negative icon="exclamation triangle" content={loginBlocking} />
                </div>
              )}
              {renderHTML(copy.subtitle)}
            </div>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    </>
  );
}

export default inject('assets', 'authenticationProviderPublicConfigsStore')(BrandingHeader);
