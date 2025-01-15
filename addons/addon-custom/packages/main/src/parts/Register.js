import _ from 'lodash';
import React from 'react';
import { observable, action, decorate, runInAction } from 'mobx';
import { inject, observer } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Form, Container, Grid, Dimmer, Loader, Segment, Label, Icon, Popup, Dropdown } from 'semantic-ui-react';

import { gotoFn } from '@aws-ee/base-ui/dist/helpers/routing';
import { branding } from '@aws-ee/base-ui/dist/helpers/settings';
import BrandingHeader from './BrandingHeader';

import { getRegisterFormFields, formValidationErrors } from '../models/RegisterForm';
import { registerUser } from '../helpers/api';
import TermsModal from './TermsModel';

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

  setTerms(terms) {
    return () => {
      this.termsModalButton.focus();
      runInAction(() => {
        this.terms = terms;
      });
    };
  }

  renderField(name) {
    const field = this.registerFormFields[name];
    const error = !_.isEmpty(this.errors.validation.get(name));

    const labelWithHelp = (
      <div>
        {field.label}&nbsp;
        {field.help && (
          <Popup
            trigger={<Icon name="info circle" color="blue" size="small" />}
            content={field.help}
            position="top center"
          />
        )}
      </div>
    );

    if (field.type === 'multiselect') {
      const handleMultiSelectChange = action((event, data) => {
        this.user[name] = data.value;
      });

      return (
        <Form.Field error={error}>
          {labelWithHelp}
          <Dropdown
            placeholder={field.placeholder}
            fluid
            multiple
            selection
            options={field.options}
            onChange={handleMultiSelectChange}
          />
        </Form.Field>
      );
    }

    if (field.type === 'select') {
      const handleDropdownChange = action((event, data) => {
        this.user[name] = data.value;
      });

      return (
        <Form.Select
          fluid
          label={labelWithHelp}
          options={field.options}
          placeholder={field.placeholder}
          error={error}
          onChange={handleDropdownChange}
        />
      );
    }

    const handleChange = action(event => {
      this.user[name] = event.target.value;
    });

    return (
      <Form.Input
        fluid
        label={labelWithHelp}
        defaultValue=""
        error={error}
        type={field.type}
        placeholder={field.placeholder}
        onChange={handleChange}
      />
    );
  }

  renderTOS() {
    return (
      <>
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
      </>
    );
  }

  renderRegisterationForm() {
    return (
      <Form size="large" loading={this.loading} onSubmit={this.handleSubmit}>
        <Segment basic className="ui fluid form">
          <Dimmer active={this.formProcessing} inverted>
            <Loader inverted>Submitting registration</Loader>
          </Dimmer>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <Grid columns={2}>
              <Grid.Column>
                {this.renderField('firstName')}
                {this.renderField('lastName')}
                {this.renderField('email')}
              </Grid.Column>
              <Grid.Column>
                {this.renderField('affiliation')}
                {this.renderField('piName')}
                {this.renderField('projectName')}
                {this.renderField('dataSources')}
              </Grid.Column>
            </Grid>
          </div>

          {branding.register.tosRequired && <div className="center mt2">{this.renderTOS()}</div>}
          <div className="center mt3">
            <div>
              <Form.Field>
                {this.errors.form && (
                  <div className="mb1">
                    <Label prompt>{this.errors.form}</Label>
                  </div>
                )}
                <Form.Button id="register-submit" disabled={this.submitDisabled()} color="green">
                  Register
                </Form.Button>
              </Form.Field>
            </div>
          </div>
        </Segment>
      </Form>
    );
  }

  submitDisabled() {
    return branding.register.tosRequired ? this.terms.value !== termsState.accepted.value : false;
  }

  renderConfirmation() {
    return (
      <BrandingHeader
        copy={{
          title: 'SUCCESS!',
          subtitle: branding.register.success,
        }}
        picsureBoxes={false}
      />
    );
  }

  renderRegister() {
    return (
      <>
        <BrandingHeader copy={branding.register} />
        <Grid
          id="register-user"
          className="animated fadeIn"
          style={{ maxWidth: '800px', margin: '0 auto', fontSize: '1.2em' }}
        >
          <Grid.Row columns={1}>
            <Grid.Column className="bodyText">{this.renderRegisterationForm()}</Grid.Column>
          </Grid.Row>
        </Grid>
      </>
    );
  }

  renderContent() {
    const { location } = this.props;
    if (location.pathname === '/register') {
      return this.renderRegister();
    }
    if (location.pathname === '/register-confirmation') {
      return this.renderConfirmation();
    }
    return <></>;
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

      // Validate that the terms have been accepted, if required
      let acceptedTerms;
      if (branding.register.tosRequired && this.terms.value !== termsState.accepted.value) {
        runInAction(() => {
          this.errors.form = termsErrorText;
          this.formProcessing = false;
        });
        return;
      }
      if (branding.register.tosRequired) {
        acceptedTerms = new Date().toISOString();
      }

      const result = await registerUser({
        firstName: this.user.firstName,
        lastName: this.user.lastName,
        email: this.user.email,
        aaAffiliation: this.user.affiliation,
        aaProjectName: this.user.projectName,
        piName: this.user.piName,
        dataSources: Array.from(this.user.dataSources),
        acceptedTerms,
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
