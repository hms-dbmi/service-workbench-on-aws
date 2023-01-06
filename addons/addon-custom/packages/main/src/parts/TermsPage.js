import React from 'react';
import { decorate } from 'mobx';
import { inject, observer } from 'mobx-react';
import { withRouter, Link } from 'react-router-dom';
import { Container, Grid, Header, Image } from 'semantic-ui-react';

import { branding } from '@aws-ee/base-ui/dist/helpers/settings';

import Terms from './Terms';

class TermsPage extends React.Component {
  renderContent() {
    return (
      <Grid
        verticalAlign="middle"
        className="animated fadeIn"
        style={{ height: '100%', maxWidth: '800px', margin: '0 auto' }}
      >
        <Grid.Row columns={2}>
          <Grid.Column>
            <Image fluid src={this.props.assets.images.registerLogo} />
          </Grid.Column>
          <Grid.Column>
            <Image fluid src={this.props.assets.images.registerAws} />
          </Grid.Column>
        </Grid.Row>
        <Grid.Row columns={1}>
          <Grid.Column>
            <Header as="h2" textAlign="center" className="header">
              {branding.main.title}
            </Header>
          </Grid.Column>
        </Grid.Row>
        <Grid.Row columns={1} className="mb3">
          <Grid.Column>
            <Terms />
            <Link to="/">Back</Link>
          </Grid.Column>
        </Grid.Row>
      </Grid>
    );
  }

  render() {
    return <Container className="mt3">{this.renderContent()}</Container>;
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(TermsPage, {});

export default inject('assets')(withRouter(observer(TermsPage)));
