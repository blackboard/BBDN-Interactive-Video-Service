import React, { useState, useEffect } from 'react';
import {
  Stack, StackItem, Spinner, SpinnerSize } from 'office-ui-fabric-react';
import { AppState } from './RootReducer'
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { localizedComponentWrapper } from 'react-babelfish';
import { OnlineMeetingInput, IStream } from './meeting-creator/models';
import { SET_MEETING_COMMAND, CREATE_MEETING_COMMAND, CreateMeetingCommand } from './meeting-creator/actions';
import { goBack, push } from 'connected-react-router';
import { hasValidSubject, hasValidDescription } from './meeting-creator/validators';
import { parameters } from './util/parameters';

import { BbPanelHeader, BbPanelType, BbPanelFooter } from '@bb-ui-toolkit/toolkit-react/lib/BbPanel';
import {ISortableTableHeader, SortableTable, SortDirection} from '@bb-ui-toolkit/toolkit-react/lib/SortableTable';
import { Label } from '@bb-ui-toolkit/toolkit-react/lib/Label';
import { MeetingPageProps } from './util/props';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const params = parameters.getInstance();

//
// Video list page component
//

const getErrorMessage = (fieldName: string) => (value: string | undefined) => {
  if (value) {
    return value.length <= 255 ? '' : `${fieldName} cannot be longer than 255 characters`;
  }
  return '';
};

const mapStateToProps = (state : AppState) => ({
  meeting: state.meeting.inputMeeting,
  creationInProgress: state.meeting.creationInProgress,
  validationFailures: {
    invalidTitle: hasValidSubject(state.meeting.inputMeeting)
      ? getErrorMessage('Meeting title')(state.meeting.inputMeeting.subject)
      : 'Invalid title',
    invalidDescription: hasValidDescription(state.meeting.inputMeeting)
      ? getErrorMessage('Description')(state.meeting.inputMeeting.description)
      : 'Invalid description'
  },
});

const goToLinkPage = (dispatch: Dispatch, meeting: OnlineMeetingInput) => {
  const title = encodeURIComponent(meeting.subject || '');
  const description = encodeURIComponent(meeting.description || '');
  const start = encodeURIComponent(meeting.startDateTime.toISOString() || '');
  const end = encodeURIComponent(meeting.endDateTime.toISOString() || '');
  dispatch(push(`/finalizeMeet?title=${title}&description=${description}&start=${start}&end=${end}`));
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  setMeeting: (meeting: OnlineMeetingInput) => {
    dispatch({
      type: SET_MEETING_COMMAND,
      meeting
    })
  },
  createMeeting: (meeting: OnlineMeetingInput) => {
    dispatch({
      type: CREATE_MEETING_COMMAND,
      fromPage: "meeting",
      meeting,
    } as CreateMeetingCommand)
  },
  cancel: () => dispatch(goBack()),
});

function CreateMeetPageComponent(props: MeetingPageProps) {
  const [validationEnabled, setValidationEnabled] = useState(false)

  const [data, setData] = useState<IStream[]>([]);
  useEffect(() => {
    fetch('streamData').then(response => response.json()).then(data => {
      setData(data);
      props.creationInProgress = false;
    });
  }, []);

  function onCreate()
  {
    if (!!props.validationFailures.invalidTitle) {
      setValidationEnabled(true);
      return;
    }

    props.createMeeting(props.meeting);

    sendMeetingToLMS(props.meeting);
  }

  function sendMeetingToLMS(meeting: OnlineMeetingInput) {

    // Send request to the Node server to send the meeting to Learn
    const requestBody = {
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

  if (props.creationInProgress) {
    return (
      <div className="spinnerContainer">
        <Spinner size={SpinnerSize.large} />
      </div>
    )
  }

  const headers: ISortableTableHeader[] = [
    {
      key: 'checkbox',
      name: 'Checkbox',
      hidden: true,
      width: 10,
    },
    {
      key: 'name',
      name: 'Name',
      width: 50,
    },
    {

      key: 'key',
      name: 'Stream Key',
      width: 50
    },
    {
      key: 'url',
      name: 'Stream URL',
      width: 200
    }
  ]

  return (
    <div className="newMeetingContainer">
      <BbPanelHeader title={props.localize.translate('ivsCreator.interactiveVideo')} smallHeaderTitle={params.getCourseName()} type={ BbPanelType.full }/>
      <h3>{props.localize.translate('ivsCreator.createANewIVS')}</h3>
      <div className="meeting-valid-notice">
        { props.localize.translate('ivsCreator.linkNotice') }
      </div>
      <Stack
        className="container"
        verticalFill
        tokens={{
          childrenGap: 35
        }} >
        <Stack>
          <div className="textfield-container">
            <StackItem grow>
              <SortableTable
                  hasActionableCells={true}
                  useGrayHeader={true}
                  headers={ headers }
                  rows={ data }
                  tableName='Interactive Streams'
                  analyticsId='ivs.sortableTable'
              />
            </StackItem>
          </div>
        </Stack>

      </Stack>
      <BbPanelFooter
        primaryButtonProps={{
          text: props.localize.translate('ivsCreator.createMeeting'),
          ariaLabel: props.localize.translate('ivsCreator.createMeeting'),
          onClick: () => onCreate()
        }}
        secondaryButtonProps={{
          text: props.localize.translate('ivsCreator.cancel'),
          ariaLabel: props.localize.translate('ivsCreator.cancel'),
          onClick: () => props.cancel()
        }}
        analyticsId="ivsCreator.createMeeting.footer"
      />
    </div>
  );
}

export default localizedComponentWrapper(connect(mapStateToProps, mapDispatchToProps)(CreateMeetPageComponent));
