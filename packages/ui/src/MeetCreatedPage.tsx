import * as React from 'react';

import { localizedComponentWrapper } from 'react-babelfish';
import { parameters } from './util/parameters';
import { BbPanelHeader, BbPanelType, BbPanelFooter } from '@bb-ui-toolkit/toolkit-react/lib/BbPanel';
import { TextField } from '@bb-ui-toolkit/toolkit-react/lib/TextField';
import { PrimaryButton } from '@bb-ui-toolkit/toolkit-react/lib/Button';
import { Label } from '@bb-ui-toolkit/toolkit-react/lib/Label';
import { MeetingPageProps } from './util/props';
import { Stack } from 'office-ui-fabric-react';
import * as queryStringLib from 'query-string';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const params = parameters.getInstance();

let textField: TextField | null = null;
let copyButton: PrimaryButton | null = null;

interface MeetCreatePageState {
  isLinkCopied: boolean;
  meetingUrl: string;
  title: string;
  description: string;
  start: string;
  end: string;
}

export class MeetCreatedPageComponent extends React.Component<MeetingPageProps, MeetCreatePageState> {

  constructor(props: MeetingPageProps) {
    super(props);

    const queryString = props.location.search;

    const { title, description, start, end } = queryStringLib.parse(queryString);

    const meetingId = uuidv4();
    const meetingUrl = `https://g.co/meet/${meetingId}`;

    this.state = {
      isLinkCopied: false,
      meetingUrl,
      title: title as string,
      description: description as string,
      start: start as string,
      end: end as string
    };
  }

  copyMeetingUrl() {
    textField?.select();
    textField?.setSelectionRange(0, textField?.value ? textField.value.length : 0);
    document.execCommand("copy");
    this.setState({
      isLinkCopied: true
    });
  }

  sendMeetingToLMS() {

    const { meetingUrl, title, description, start, end } = this.state;

    // Send request to the Node server to send the meeting to Learn
    const requestBody = {
      "startDateTime": start,
      "endDateTime": end,
      "subject": title,
      "description": description,
      "url": meetingUrl,
      "nonce": params.getNonce(),
    };

    axios.post("/sendMeeting", requestBody, {
      headers: {
        'Content-type': 'application/json'
      }
    }).then(response => {

      // The LTI Deep Linking spec requires a form POST back to the Platform
      const form = document.createElement('form');
      form.setAttribute('action', params.getReturnUrl() as string);
      form.setAttribute('method', 'POST');
      const jwtParam = document.createElement('input');
      jwtParam.setAttribute('name', 'JWT')
      jwtParam.setAttribute('value', response.data);
      form.appendChild(jwtParam);
      document.body.appendChild(form);
      form.submit();
    });
  }

  render() {
    const { localize } = this.props;
    const { isLinkCopied, meetingUrl } = this.state;

    function copyLinkText() {
      return isLinkCopied ? localize.translate('ivsCreator.copied') : localize.translate('ivsCreator.copyLink');
    }
    
    return (
      <div className="newMeetingContainer">
        <BbPanelHeader title={localize.translate('ivsCreator.interactiveVideo')} smallHeaderTitle={params.getCourseName()} type={ BbPanelType.full }/>
        <img className="zero-state" src="zero-state.svg" />
        <Stack
          className="container copy-link"
          verticalFill
          tokens={{
            childrenGap: 35
          }} >
          <div className="copy-link-instructions">
            <h3>{ localize.translate('ivsCreator.meetingCreated') }</h3>
            { localize.translate('ivsCreator.addedToCalendar') }
          </div>
          <div className="copy-link-widget">
            <Label>{ localize.translate('ivsCreator.linkToShare') }</Label>
            <Stack className="copy-link-controls" horizontal>
              <TextField
                ariaLabel={ localize.translate('ivsCreator.linkToShare') }
                className="copy-link-textfield"
                ref={ (ref: TextField) => { textField = ref} }
                value={ meetingUrl } isReadOnly={true}
                analyticsId="ivsCreator.linkPage.readOnlyLink.input.text"
              />
              <PrimaryButton
                ariaLabel={ copyLinkText() }
                className={ `copy-link-button ${isLinkCopied ? 'post-copy' : ''}` }
                ref={ (ref: PrimaryButton) => { copyButton = ref; }}
                onClick={ () => this.copyMeetingUrl() }
                analyticsId="ivsCreator.linkPage.copyLink.button"
              >
                { copyLinkText() }
              </PrimaryButton>
            </Stack>
          </div>
          <p className="link-notice">
            { localize.translate('ivsCreator.linkNotice') }
          </p>
        </Stack>
        <BbPanelFooter
          primaryButtonProps={{
            text: localize.translate('ivsCreator.done'),
            ariaLabel: localize.translate('ivsCreator.done'),
            onClick: () => this.sendMeetingToLMS()
          }}
          analyticsId="ivsCreator.linkPage.footer"
        />
      </div>
    );
  }
}

export default localizedComponentWrapper(MeetCreatedPageComponent);
