
import React from 'react';
import { decorate, observable, runInAction } from 'mobx';
import { observer } from 'mobx-react';
import { Button, Modal } from 'semantic-ui-react';

import { branding } from '@aws-ee/base-ui/dist/helpers/settings';

import Terms from './Terms';

{/* <TermsModal
  acceptAction={() => console.log('accepted tos')}
  declineAction={() => console.log('declined tos')}
  /> */}
class TermsModal extends React.Component {
  constructor(props) {
    super(props);

    runInAction(() => {
      this.modalOpen = false;
    });
  }

  closeModal(action = () => {}) {
    return () => runInAction(() => { action(); this.modalOpen = false; });
  }
  openModel() {
    return () => runInAction(() => { this.modalOpen = true; });
  }

  render() {
    const { acceptAction, declineAction, Launcher = Button } = this.props;
    return (
      <Modal
        centered={false}
        open={this.modalOpen}
        onClose={this.closeModal()}
        onOpen={this.openModel()}
        trigger={<Launcher>Terms of Service</Launcher>}
      >
        <Modal.Header>{branding.main.title} Terms of Service</Modal.Header>
        <Modal.Content>
          <Modal.Description>
            <Terms />
          </Modal.Description>
        </Modal.Content>
        <Modal.Actions>
          <Button onClick={this.closeModal(acceptAction)}>Accept</Button>
          <Button onClick={this.closeModal(declineAction)}>Decline</Button>
        </Modal.Actions>
      </Modal>
    )
  }
}

// see https://medium.com/@mweststrate/mobx-4-better-simpler-faster-smaller-c1fbc08008da
decorate(TermsModal, {
  modalOpen: observable,
});

export default observer(TermsModal);