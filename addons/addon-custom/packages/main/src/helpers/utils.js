/* eslint-disable import/prefer-default-export */
import React from 'react';
import * as DOMPurify from 'dompurify';

function renderHTML(content) {
  console.log('DEBUG', content);
  const cleanContent = DOMPurify.sanitize(content, { USE_PROFILES: { html: true }, ADD_ATTR: ['target'] });

  // This method sets html from a string. We're pulling this from the config file made by
  // an approved admin, and we're sanitizing using dompurify package.
  // https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
  // eslint-disable-next-line react/no-danger
  return <div dangerouslySetInnerHTML={{ __html: cleanContent }} />;
}

export { renderHTML };
