import React from 'react';
import { Stack, Text, FontWeights, PrimaryButton, DefaultButton } from 'office-ui-fabric-react';
import { AppState } from './RootReducer'
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { goBack } from 'connected-react-router';
import { localizedComponentWrapper } from 'react-babelfish';
import { OnlineMeetingInput } from './meeting-creator/models';
import { CREATE_MEETING_COMMAND, CreateMeetingCommand } from './meeting-creator/actions';

const semiboldStyle = { root: { fontWeight: FontWeights.semibold } };

interface ErrorPageProps {
  meeting: OnlineMeetingInput,
  goBack: () => void,
  createMeeting: (meeting: OnlineMeetingInput) => void,
  localize: any
}

const mapStateToProps = (state : AppState) => ({
  meeting: state.meeting.inputMeeting,
});

const mapDispatchToProps = (dispatch: Dispatch) => ({
  goBack: () => dispatch(goBack()),
  createMeeting: (meeting: OnlineMeetingInput) => {
    dispatch({
      type: CREATE_MEETING_COMMAND,
      fromPage: "error",
      meeting,
    } as CreateMeetingCommand)
  }
});

function ErrorPageComponent(props: ErrorPageProps) {
  return (
    <Stack
      className="container"
      horizontalAlign="center"
      verticalAlign="center"
      verticalFill
      tokens={{
        childrenGap: 35
      }}>
      <img
        className="splashImage"
        src="https://statics.teams.microsoft.com/hashedassets-launcher/launcher_meetings_new.b2c45282207c2dff1f96b89f128a7e31.svg"
        alt="logo"
      />
      <Text variant="xxLarge" styles={semiboldStyle}>
        Oops! Your meeting wasn't created successfully.
      </Text>
      <Text variant="large" className="uTextCenter">
        Please try again. If the problem persists, check with your IT administrator to ensure you have the proper permissions.
      </Text>
      <Stack horizontal tokens={{childrenGap: 10}}>
        <DefaultButton
          className="teamsButtonInverted"
          text="Back"
          onClick={(event) => props.goBack()} 
          ariaLabel="Back to last screen"
        />
        <PrimaryButton
          className="teamsButton"
          primary text="Try again" 
          onClick={(event) => props.createMeeting(props.meeting)} 
          ariaLabel="Try again"
        />
      </Stack>
    </Stack>
  );
}

export default localizedComponentWrapper(connect(mapStateToProps, mapDispatchToProps)(ErrorPageComponent));