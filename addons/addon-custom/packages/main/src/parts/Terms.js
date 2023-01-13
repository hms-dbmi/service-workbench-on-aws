import React from 'react';
import { Header } from 'semantic-ui-react';
import * as DOMPurify from 'dompurify';

import tos from '../../data/terms';

const readableStyle = { fontSize: 'max(12pt, 1.2rem)', fontFamily: 'Calibri' };

class Terms extends React.PureComponent {
  renderHTML(content) {
    const cleanContent = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });

    // This method sets html from a string. We're pulling this from the config file made by
    // an approved admin, and we're sanitizing using dompurify package.
    // https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
    // eslint-disable-next-line react/no-danger
    return <div dangerouslySetInnerHTML={{ __html: cleanContent }} style={readableStyle} />;
  }

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
        {this.renderHTML(populatedTerms)}
      </div>
    );
  }
}

export default Terms;
