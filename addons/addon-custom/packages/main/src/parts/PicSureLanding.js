import React from 'react';
import { inject, observer } from 'mobx-react';
import { decorate, computed } from 'mobx';
import { Button, Grid, Modal } from 'semantic-ui-react';

import { gotoFn } from '@aws-ee/base-ui/dist/helpers/routing';
import { branding } from '@aws-ee/base-ui/dist/helpers/settings';
import BrandingHeader from './BrandingHeader';

class PicSureLanding extends React.Component {
  componentDidMount() {
    document.title = branding.picsure.browserTitle;
  }

  get userStore() {
    return this.props.userStore;
  }

  gotoLogin() {
    return () => {
      this.userStore.bypassLanding();
      gotoFn(this)('/');
    };
  }

  render() {
    const borders = {
      margin: '0px 10px',
      border: 'solid #2A5FA3 2px',
      borderRadius: '4px',
      padding: '10px',
      backgroundColor: 'white',
    };
    const h3 = { textTransform: 'uppercase', color: '#2A5FA3', textDecoration: 'underline' };

    return (
      <Modal id="picsure-landing" size="fullscreen" closeOnEscape open>
        <Modal.Content>
          <BrandingHeader copy={branding.picsure} picsureBoxes={false} />
          <Grid id="picsure-splash" verticalAlign="middle" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Grid.Row columns={2}>
              <Grid.Column>
                <Button className="center" style={borders} onClick={this.gotoLogin()}>
                  <h3 className="header" style={h3}>
                    VISIT SERVICE WORKBENCH
                  </h3>
                  <p>Simple, accessible cloud computing & secure data storage.</p>
                </Button>
              </Grid.Column>
              <Grid.Column>
                <Button as="a" href={branding.picsure.url} className="center" style={borders}>
                  <h3 className="header" style={h3}>
                    VISIT PIC-SURE
                  </h3>
                  <p>A self-service, easily navigable patient-level clinical data search and cohort tool.</p>
                </Button>
              </Grid.Column>
            </Grid.Row>
          </Grid>
        </Modal.Content>
      </Modal>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(PicSureLanding, {
  userStore: computed,
});
export default inject('assets', 'userStore')(observer(PicSureLanding));
