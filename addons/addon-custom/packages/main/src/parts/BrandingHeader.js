import React from 'react';
import { inject } from 'mobx-react';

import { Grid, Image, Header, Message } from 'semantic-ui-react';
import { branding } from '@aws-ee/base-ui/dist/helpers/settings';

import { renderHTML } from '../helpers/utils';

export function BrandingHeader({ copy, assets, picsureBoxes = true, authenticationProviderPublicConfigsStore }) {
  const borders = { margin: '0px 10px', border: 'solid #2A5FA3 2px', borderRadius: '4px', padding: '10px' };
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
              {loginBlocking && (
                <div className="mb2">
                  <Message negative icon="exclamation triangle" content={loginBlocking} />
                </div>
              )}
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
                <span>Access to:</span>
                <ul>
                    <li>OCHIN Data (with appropriate data authorization)</li>
                    <li>Amazon Web Services Open Access Datasets</li>
                    <li>National Health and Nutrition Examination Survey Data</li>
                    <li>Upload your own data into the FISMA-secure environment</li>
                </ul>
                <span>Computational environments available:</span>
                <ul>
                    <li>Rstudio</li>
                    <li>SageMaker (Jupyter Notebooks)</li>
                    <li>Linux EC2</li>
                    <li>Remote WIndows Desktop</li>
                </ul>
                <a href="https://pic-sure.gitbook.io/service-workbench/" target="_blank" rel="noreferrer">
                  Learn More
                </a>
              </div>
            </Grid.Column>
            <Grid.Column>
              <div className="bordered center" style={borders}>
                <h3 className="header" style={{ textTransform: 'uppercase' }}>
                  PIC-SURE
                </h3>
                <p>A self-service, easily navigable patient-level clinical data search and cohort tool.</p>
                <span>Explore:</span>
                <ul>
                    <li>National Health and Nutrition Examination Survey Data</li>
                </ul>
                <span>Export patient-level cohorts:</span>
                <ul>
                    <li>To your local machine</li>
                    <li>To Service Workbench</li>
                </ul>
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

export default inject('assets', 'authenticationProviderPublicConfigsStore')(BrandingHeader);
