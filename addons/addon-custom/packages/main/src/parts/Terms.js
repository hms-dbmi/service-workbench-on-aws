import React from 'react';
import { Header } from 'semantic-ui-react';

import tos from '../../data/terms';

const readableStyle = { fontSize: 'max(12pt, 1.2rem)', fontFamily: 'Calibri' };

class Terms extends React.PureComponent {
  render() {
    const populatedTerms = Object.entries(tos[0].fields).reduce(
      (terms, [field, value]) => terms.replaceAll(`{${field.toUpperCase()}}`, value),
      tos[0].terms,
    ).replaceAll('{HOSTNAME}', window.location.hostname);
    const date = new Date(tos[0].date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // This method sets html from a string. Because we're pulling this from the config file made by
    // an approved admin, we know the value is safe so there is no danger in using it directly below.
    // https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
    // eslint-disable-next-line react/no-danger
    const content = <div dangerouslySetInnerHTML={{ __html: populatedTerms }} style={readableStyle} />;
    return (
      <div id="tos">
        <Header as="h3" textAlign="center">
          Terms as of {date}
        </Header>
        {content}
      </div>
    );
  }
}

export default Terms;
