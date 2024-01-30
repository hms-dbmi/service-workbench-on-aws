import React from 'react';
import { Header } from 'semantic-ui-react';

import tos from '../../data/terms';
import { renderHTML } from '../helpers/utils';

class Terms extends React.PureComponent {
  render() {
    const populatedTerms = Object.entries(tos[0].fields)
      .reduce((terms, [field, value]) => terms.replaceAll(`{${field.toUpperCase()}}`, value), tos[0].terms)
      .replaceAll('{HOSTNAME}', window.location.hostname);

    const date = new Date(tos[0].date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <div id="tos">
        <Header as="h3" textAlign="center">
          Terms as of {date}
        </Header>
        {renderHTML(populatedTerms)}
      </div>
    );
  }
}

export default Terms;
