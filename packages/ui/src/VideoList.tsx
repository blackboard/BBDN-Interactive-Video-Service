import React, { useState, useEffect } from 'react';
import {
  Stack, StackItem, Spinner, SpinnerSize } from 'office-ui-fabric-react';
import { AppState } from './RootReducer'
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { localizedComponentWrapper } from 'react-babelfish';
import { OnlineMeetingInput, IStream, createDefaultMeetingInput } from './meeting-creator/models';
import { goBack, push } from 'connected-react-router';
import { hasValidSubject, hasValidDescription } from './meeting-creator/validators';
import { parameters } from './util/parameters';
import {
  SET_MEETING_COMMAND,
  SetMeetingCommand
} from './meeting-creator/actions';

import { DefaultButton } from '@bb-ui-toolkit/toolkit-react/lib/Button';
import { BbPanelHeader, BbPanelType, BbPanelFooter } from '@bb-ui-toolkit/toolkit-react/lib/BbPanel';
import {ISortableTableHeader, SortableTable, SortDirection} from '@bb-ui-toolkit/toolkit-react/lib/SortableTable';
import { defaultOnClick } from '@bb-ui-toolkit/toolkit-react/lib/utilities/analytics';
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

interface ViewStreamsProps {
  onNewMeeting: () => void,
  loading: boolean,
  localize: any,
  cancel: () => void
  data: IStream[];
}

const mapStateToProps = (state : AppState) => ({});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  onNewMeeting: () => {
    dispatch({
      type: SET_MEETING_COMMAND,
      meeting: createDefaultMeetingInput()
    } as SetMeetingCommand);
    dispatch(push('/createMeeting'));
  },

  cancel: () => dispatch(goBack()),
});

function CreateMeetPageComponent(props: ViewStreamsProps) {
  const [validationEnabled, setValidationEnabled] = useState(false)

  const [data, setData] = useState<IStream[]>([]);
  useEffect(() => {
    fetch('/streamData').then(response => response.json()).then(data => {
      setData(data);
      props.loading = false;
    });
  }, []);

  function onCreate()
  {
    sendMeetingToLMS(props.data);
  }

  function sendMeetingToLMS(data: IStream[]) {

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

  if (props.loading) {
    return (
      <div className="spinnerContainer">
        <Spinner size={SpinnerSize.large} />
      </div>
    )
  }

  const headers: ISortableTableHeader[] = [
    {
      key: 'checkbox',
      name: props.localize.translate('ivsCreator.checkAll'),
      hidden: true,
      width: 10,
    },
    {
      key: 'name',
      name: props.localize.translate('ivsCreator.streamName'),
      width: 50,
    },
    {

      key: 'key',
      name: props.localize.translate('ivsCreator.streamKey'),
      width: 50
    },
    {
      key: 'url',
      name: props.localize.translate('ivsCreator.streamUrl'),
      width: 200
    }
  ]

  return (
    <div className="streamListContainer">
      <BbPanelHeader title={props.localize.translate('ivsCreator.interactiveVideo')} smallHeaderTitle={params.getCourseName()} type={ BbPanelType.full }/>
      <h3>{props.localize.translate('ivsCreator.streamList')}</h3>
      <DefaultButton
          className="new-stream-button"
          data-automation-id='createStreamButton'
          description={props.localize.translate('ivsCreator.createNewStreamDesc')}
          text={props.localize.translate('ivsCreator.createANewIVS')}
          analyticsId='createStreamButton.button'
          onClick={() => props.onNewMeeting()}
      />
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
                  tableName={ props.localize.translate('ivsCreator.tableName') }
                  analyticsId='ivs.sortableTable'
              />
            </StackItem>
          </div>
        </Stack>

      </Stack>
      <BbPanelFooter
        primaryButtonProps={{
          text: props.localize.translate('ivsCreator.addStream'),
          ariaLabel: props.localize.translate('ivsCreator.addStream'),
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
