import _ from 'lodash';
import React from 'react';
import { observable, action, decorate, runInAction } from 'mobx';
import { inject, observer } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Form, Container, Grid, Dimmer, Loader, Header, Segment, Image, Label, Icon } from 'semantic-ui-react';
import * as DOMPurify from 'dompurify';

import { gotoFn } from '@aws-ee/base-ui/dist/helpers/routing';
import { branding } from '@aws-ee/base-ui/dist/helpers/settings';

import { getRegisterFormFields, formValidationErrors } from '../models/RegisterForm';
import { registerUser } from '../helpers/api';
import TermsModal from './TermsModel';

const styles = {
  header: { fontFamily: 'Handel Gothic,Futura,Trebuchet MS,Arial,sans-serif' },
  bodyText: { fontFamily: 'Futura,Trebuchet MS,Arial,sans-serif' },
};
const termsState = {
  accepted: { value: 'accepted', icon: 'check circle outline', color: 'green', label: 'I have read and accept the' },
  declined: { value: 'declined', icon: 'times circle outline', color: 'red', label: 'I have declined the' },
  unset: { value: 'unset', icon: 'circle outline', color: 'black', label: 'To continue, please review the ' },
};

const errorText =
  'ERROR There was an unexpected error while processing your request. Please review your information and try again.';
const termsErrorText = 'You must accept the terms of service to register.';

class Register extends React.Component {
  constructor(props) {
    super(props);
    runInAction(() => {
      this.formProcessing = false;
      this.errors = {
        validation: new Map(),
        form: '',
      };
      this.user = {};
      this.terms = termsState.unset;
      this.termsModalButton = { focus: () => {} };
    });
    this.registerFormFields = getRegisterFormFields();
  }

  goto = gotoFn(this);

  renderField(name) {
    const field = this.registerFormFields[name];
    const error = !_.isEmpty(this.errors.validation.get(name));

    const handleChange = action(event => {
      this.user[name] = event.target.value;
    });
    return (
      <Form.Input
        fluid
        label={field.label}
        defaultValue=""
        error={error}
        placeholder={field.placeholder}
        onChange={handleChange}
      />
    );
  }

  renderHTML(content) {
    const cleanContent = DOMPurify.sanitize(content, { USE_PROFILES: { html: true } });

    // This method sets html from a string. We're pulling this from the config file made by
    // an approved admin, and we're sanitizing using dompurify package.
    // https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
    // eslint-disable-next-line react/no-danger
    return <div dangerouslySetInnerHTML={{ __html: cleanContent }} />;
  }

  setTerms(terms) {
    return () => {
      this.termsModalButton.focus();
      runInAction(() => {
        this.terms = terms;
      });
    };
  }

  renderRegisterationForm() {
    return (
      <Form size="large" loading={this.loading} onSubmit={this.handleSubmit}>
        <Header as="h2" textAlign="center" className="header">
          {branding.register.title}
        </Header>
        {this.renderHTML(branding.register.summary)}
        <Segment basic className="ui fluid form">
          <Dimmer active={this.formProcessing} inverted>
            <Loader inverted>Submitting registration</Loader>
          </Dimmer>
          <div style={{ maxWidth: 450, margin: '0 auto' }}>
            {this.renderField('firstName')}

            {this.renderField('lastName')}

            {this.renderField('email')}
          </div>
          <div className="center mt3">
            {this.terms.value !== termsState.unset.value && <Icon name={this.terms.icon} color={this.terms.color} />}
            {this.terms.label} &nbsp;
            <TermsModal
              trigger={
                <button
                  id="terms-modal"
                  className="link"
                  type="button"
                  ref={ref => {
                    this.termsModalButton = ref;
                  }}
                >
                  Terms of Service
                </button>
              }
              closeOnDimmerClick
              acceptAction={this.setTerms(termsState.accepted)}
              declineAction={this.setTerms(termsState.declined)}
            />
          </div>
          <div className="mt3 center">
            <div>
              <Form.Field>
                {this.errors.form && (
                  <div className="mb1">
                    <Label prompt>{this.errors.form}</Label>
                  </div>
                )}
                <Form.Button
                  id="register-submit"
                  disabled={this.terms.value !== termsState.accepted.value}
                  color="green"
                >
                  Create a new Service Workbench account
                </Form.Button>
              </Form.Field>
            </div>
          </div>
        </Segment>
      </Form>
    );
  }

  renderConfirmation() {
    return (
      <div>
        <Header as="h2" textAlign="center" style={styles.header}>
          SUCCESS!
        </Header>
        {this.renderHTML(branding.register.success)}
      </div>
    );
  }

  renderContent() {
    const { location } = this.props;

    return (
      <Grid
        id="register-user"
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
          <Grid.Column className="bodyText">
            {location.pathname === '/register' && this.renderRegisterationForm()}
            {location.pathname === '/register-confirmation' && this.renderConfirmation()}
          </Grid.Column>
        </Grid.Row>
      </Grid>
    );
  }

  handleSubmit = action(async event => {
    event.preventDefault();
    event.stopPropagation();

    // Reset form errors
    runInAction(() => {
      this.errors.validation = new Map();
      this.errors.form = '';
      this.formProcessing = true;
    });

    try {
      // if there are any client side validation errors then do not attempt to make API call
      const validationResult = await formValidationErrors(this.user);
      if (validationResult.failed) {
        runInAction(() => {
          this.errors.validation = validationResult.errors;
          this.errors.form = validationResult.message;
          this.formProcessing = false;
        });
        return;
      }

      // Validate that the terms have been accepted
      if (this.terms.value !== termsState.accepted.value) {
        runInAction(() => {
          this.errors.form = termsErrorText;
          this.formProcessing = false;
        });
        return;
      }

      const result = await registerUser({
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email,
        acceptedTerms: new Date().toISOString(),
      });
      // if we encounter an error then don't continue to process the form and instead display a message
      if (result.error) {
        console.error(result);
        runInAction(() => {
          this.errors.validation = new Map();
          this.errors.form = errorText;
          this.formProcessing = false;
        });
        return;
      }

      // reset form and page state in case the user hits their back button
      runInAction(() => {
        this.errors.validation = new Map();
        this.errors.form = '';
        this.formProcessing = false;
        this.user = {};
      });
      this.goto('/register-confirmation');
    } catch (error) {
      console.error(error);
      runInAction(() => {
        this.errors.validation = new Map();
        this.errors.form = errorText;
        this.formProcessing = false;
      });
    }
  });

  render() {
    return <Container className="mt3">{this.renderContent()}</Container>;
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(Register, {
  formProcessing: observable,
  user: observable,
  errors: observable,
  terms: observable,
});

export default inject('assets')(withRouter(observer(Register)));
