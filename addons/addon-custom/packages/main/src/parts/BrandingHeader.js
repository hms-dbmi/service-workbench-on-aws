import React from 'react';
import { inject } from 'mobx-react';

import { Grid, Image, Header } from 'semantic-ui-react';
import { branding } from '@aws-ee/base-ui/dist/helpers/settings';

import { renderHTML } from '../helpers/utils';

export function BrandingHeader({ copy, assets, picsureBoxes = true }) {
  const borders = { margin: '0px 10px', border: 'solid #2A5FA3 2px', borderRadius: '4px', padding: '10px' };
  const maxImageWidth = { height: 'auto', maxWidth: '350px', margin: 'auto' };

  return (
    <>
      <Grid
        verticalAlign="middle"
        className="animated fadeIn"
        style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.2em' }}
      >
        <Grid.Row columns={1}>
          <Grid.Column>
            <Image fluid src={assets.images.registerLogo} style={maxImageWidth} />
          </Grid.Column>
        </Grid.Row>
        <Grid.Row columns={1}>
          <Grid.Column className="bodyText">
            <div className="center">
              <Header as="h2" textAlign="center" className="header">
                {copy.title}
              </Header>
              {renderHTML(copy.subtitle)}
            </div>
          </Grid.Column>
        </Grid.Row>
        {branding.picsure.dualBranding && picsureBoxes && (
          <Grid.Row columns={2}>
            <Grid.Column>
              <div className="bordered center" style={borders}>
                <h3 className="header" style={{ textTransform: 'uppercase' }}>
                  Service Workbench
                </h3>
                <p>Simple, accessible cloud computing & secure data storage.</p>
                <a href="https://pic-sure.gitbook.io/service-workbench/" target="_blank" rel="noreferrer">
                  Learn More
                </a>
              </div>
            </Grid.Column>
            <Grid.Column>
              <div className="bordered center" style={borders}>
                <h3 className="header" style={{ textTransform: 'uppercase' }}>
                  PIC-Sure
                </h3>
                <p>A self-service, easily navigable patient-level clinical data search and cohort tool.</p>
                <a href="https://pic-sure.gitbook.io/aim-ahead-pic-sure/" target="_blank" rel="noreferrer">
                  Learn More
                </a>
              </div>
            </Grid.Column>
          </Grid.Row>
        )}
      </Grid>
    </>
  );
}

export default inject('assets')(BrandingHeader);
