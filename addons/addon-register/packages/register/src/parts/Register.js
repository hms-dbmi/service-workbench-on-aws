import _ from 'lodash';
import React from 'react';
import { observable, action, decorate, runInAction } from 'mobx';
import { inject, observer } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { Button, Form, Container, Grid, Dimmer, Loader, Header, Segment, Image, Label } from 'semantic-ui-react';

import validate from '@aws-ee/base-ui/dist/models/forms/Validate';
import { gotoFn } from '@aws-ee/base-ui/dist/helpers/routing';

import { getRegisterForm, getRegisterFormFields } from '../models/RegisterForm';
import { registerUser } from '../helpers/api';

const styles = {
  header: { fontFamily: 'Handel Gothic,Futura,Trebuchet MS,Arial,sans-serif' },
  bodyText: { fontFamily: 'Futura,Trebuchet MS,Arial,sans-serif' }
}

class Register extends React.Component {
  constructor(props) {
    super(props);
    runInAction(() => {
      this.formProcessing = false;
      this.errors = {
        validation: new Map(),
        form: ''
      }
      this.user = {};
    });
    this.form = getRegisterForm();
    this.registerFormFields = getRegisterFormFields();
  }

  goto = gotoFn(this);

  processing(state) {
    runInAction(() => {
      this.errors.form = '';
      this.formProcessing = state;
    });
  }

  populateErrors = (errors) => {
    const fieldErrors = ['firstName', 'lastName', 'email']
      .filter(field => !_.isEmpty(errors.get(field)))
      .map(field => this.registerFormFields[field].placeholder);
    
    if(fieldErrors.length > 0){
      // Return a user friendly comment with fields that have not passed validation
      const finalField = fieldErrors.pop();
      const fieldString = fieldErrors.length > 0
        ? fieldErrors.join(', ') + ' and ' + finalField
        : finalField;
      return `Please populate ${fieldString}.`;
    } else if(!this.user.terms){
      return 'You must be 18 years or older and agree to the terms of service to register.';
    }
    return false;
  }

  renderCheckbox(name) {
    const error = !_.isEmpty(this.errors.validation.get(name));

    const handleChange = action((event, { checked }) => {
      this.user[name] = checked;
    });
    return (
      <Form.Checkbox
        error={error}
        label={this.registerFormFields[name].label}
        defaultValue={this.user[name]}
        onChange={handleChange}
        className="mt3"
      />
    );
  }

  renderField(name) {
    const field = this.registerFormFields[name];
    const error = !_.isEmpty(this.errors.validation.get(name));

    const handleChange = action(event => {
      this.user[name] = event.target.value;
    });
    return (
      <Form.Input fluid
        label={field.label}
        defaultValue=''
        error={error}
        placeholder={field.placeholder}
        onChange={handleChange}
      />
    );
  }

  renderRegisterationForm() {
    return (
      <Form
        size="large"
        loading={this.loading}
        onSubmit={this.handleSubmit}
      >
        <Header as="h2" textAlign="center" style={styles.header}>
          WELCOME TO AIM-AHEAD's SERVICE WORKBENCH ON AWS
        </Header>
        <p>AIM-AHEAD's Service Workbench on AWS provides a self-service, three-click, on-demand service 
          for researchers to build research environments in minutes without needing cloud infrastructure 
          knowledge. Fill out the form below to create your account on Service Workbench on AWS.</p>
        <Segment basic className="ui fluid form">
          <Dimmer active={this.formProcessing} inverted>
            <Loader inverted>Submitting registration</Loader>
          </Dimmer>
          <div style={{ maxWidth: 450, margin: '0 auto' }}>
            {this.renderField('firstName')}

            {this.renderField('lastName')}

            {this.renderField('email')}
          </div>
          <div style={{ textAlign: 'center' }}>
            {this.renderCheckbox('terms')}
          </div>
          <div className="mt3" style={{ textAlign: 'center' }}>
            <div>
              <Form.Field>
                {this.errors.form && (<div className="mb1"><Label prompt>{this.errors.form}</Label></div>)}
                <Button type="submit" color="green">
                  Create a new Service Workbench on AWS account
                </Button>
              </Form.Field>
            </div>
          </div>
        </Segment>
      </Form>
    );
  }

  renderConfirmation(){
    return (
      <div>
        <Header as="h2" textAlign="center" style={styles.header}>SUCCESS!</Header>
        <p>Your AIM-AHEAD Service Workbench on AWS account has been successfully created. What you should expect next:</p>
        <ol>
          <li>The AIM-AHEAD Service Workbench on AWS administrator will review your account.</li> 
          <li>You will receive an email sent from Okta to create a password.</li>
          <li>Login to Service Workbench on AWS and start your research.</li>
        </ol>
        <p>You can access the AIM-AHEAD Service Workbench on AWS User Guide 
          <a href="https://docs.google.com/document/d/1nrpLLpmm66-G7Mo-BOBUkGu-DN7fD8YCK3SL9CrPhp0/edit">here</a>.</p>
      </div>
    )
  }

  renderContent(){
    const { location } = this.props;

    return (
        <Grid verticalAlign="middle" className="animated fadeIn" style={{ height: '100%', maxWidth: '800px', margin: '0 auto' }}>
          <Grid.Row columns={2}>
            <Grid.Column><Image fluid src={this.props.assets.images.registerLogo} /></Grid.Column>
            <Grid.Column><Image fluid src={this.props.assets.images.registerAws} /></Grid.Column>
          </Grid.Row>
          <Grid.Row columns={1}>
            <Grid.Column style={styles.bodyText}>
              {location.pathname === '/register' && this.renderRegisterationForm()}
              {location.pathname === '/register-confirmation' && this.renderConfirmation()}
            </Grid.Column>
          </Grid.Row>
        </Grid>
    );
  }

  handleSubmit = action(async (event) => {
    event.preventDefault();
    event.stopPropagation();
    this.processing(true);

    try {
      const validationResult = await validate(this.user, this.registerFormFields);
      // if there are any client side validation errors then do not attempt to make API call
      if (validationResult.fails()) {
        runInAction(() => {
          this.errors.validation = validationResult.errors;
          this.errors.form = this.populateErrors(validationResult.errors);
          this.formProcessing = false;
        });
      } else { // otherwise, send the api call
        await registerUser({
          firstName: this.user.firstName,
          lastName: this.user.lastName,
          email: this.user.email
        });
        // reset form and page state in case the user hits their back button
        runInAction(() => {
          this.errors.validation = new Map();
          this.errors.form = '';
          this.formProcessing = false;
          this.user = {};
        });
        this.goto('/register-confirmation');
      }
    } catch (error) {
      console.error(error);
      runInAction(() => {
        this.errors.validation = new Map();
        this.errors.form = 'ERROR: There was an unexpected error while processing your request. Please review your information and try again.';
        this.formProcessing = false;
      });
    }
  });

  render() {
    return (<Container className="mt3">{this.renderContent()}</Container>);
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(Register, {
  formProcessing: observable,
  user: observable,
  errors: observable
});

export default inject(
  'assets'
)(withRouter(observer(Register)));