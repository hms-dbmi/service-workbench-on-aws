import React from 'react';
import { decorate, observable, runInAction } from 'mobx';
import { inject, observer } from 'mobx-react';
import { Button, Modal, Dimmer, Loader } from 'semantic-ui-react';

import { branding } from '@aws-ee/base-ui/dist/helpers/settings';
import { displayError } from '@aws-ee/base-ui/dist/helpers/notification';

import Terms from './Terms';

class TermsModal extends React.Component {
  constructor(props) {
    super(props);

    runInAction(() => {
      this.modalOpen = this.props.defaultOpen || false;
      this.loggingOut = false;
    });
  }

  closeModal(action = () => {}) {
    return () =>
      runInAction(() => {
        action();
        this.modalOpen = false;
      });
  }

  openModel() {
    return () =>
      runInAction(() => {
        this.modalOpen = true;
      });
  }

  handleLogout(action = () => {}) {
    return async () => {
      try {
        runInAction(() => {
          this.loggingOut = true;
        });
        action();
        await this.props.authentication.logout();
      } catch (error) {
        displayError(error);
      }
    };
  }

  render() {
    const {
      acceptAction,
      declineAction,
      logoutOnDecline = false,
      trigger,
      className = '',
      closeOnDimmerClick = false,
      title = `${branding.main.title} Terms of Service`,
    } = this.props;

    return (
      <>
        <Dimmer page active={this.loggingOut}>
          <Loader>Logging Out</Loader>
        </Dimmer>
        <Modal
          closeOnDimmerClick={closeOnDimmerClick}
          closeOnEscape={false}
          centered={!this.loggingOut || false}
          open={this.modalOpen}
          onClose={this.closeModal()}
          onOpen={this.openModel()}
          trigger={trigger}
          className={className}
        >
          <Modal.Header>{title}</Modal.Header>
          <Modal.Content>
            <Modal.Description>
              <Terms />
            </Modal.Description>
          </Modal.Content>
          <Modal.Actions>
            {acceptAction && declineAction ? (
              <>
                <Button primary onClick={this.closeModal(acceptAction)}>
                  Accept
                </Button>
                <Button onClick={logoutOnDecline ? this.handleLogout(declineAction) : this.closeModal(declineAction)}>
                  Decline
                </Button>
              </>
            ) : (
              <Button primary onClick={this.closeModal()}>
                Close
              </Button>
            )}
          </Modal.Actions>
        </Modal>
      </>
    );
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(TermsModal, {
  modalOpen: observable,
  loggingOut: observable,
});

export default inject('authentication')(observer(TermsModal));
