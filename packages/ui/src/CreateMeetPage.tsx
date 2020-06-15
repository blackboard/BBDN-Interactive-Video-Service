import React, { useState } from 'react';
import {
  Stack, StackItem, DatePicker,
  IDatePickerStrings, DayOfWeek, ComboBox, IComboBoxOption, IComboBox, Spinner, SpinnerSize } from 'office-ui-fabric-react';
import { AppState } from './RootReducer'
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { localizedComponentWrapper } from 'react-babelfish';
import _ from 'lodash';
import moment, { Moment, Duration } from 'moment'
import { OnlineMeetingInput } from './meeting-creator/models';
import { SET_MEETING_COMMAND, CREATE_MEETING_COMMAND, CreateMeetingCommand } from './meeting-creator/actions';
import { goBack, push } from 'connected-react-router';
import { hasValidSubject, hasValidDescription } from './meeting-creator/validators';
import { parameters } from './util/parameters';

import { BbPanelHeader, BbPanelType, BbPanelFooter } from '@bb-ui-toolkit/toolkit-react/lib/BbPanel';
import { TextField } from '@bb-ui-toolkit/toolkit-react/lib/TextField';
import { Label } from '@bb-ui-toolkit/toolkit-react/lib/Label';
import { MeetingPageProps } from './util/props';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const params = parameters.getInstance();

function formatDuration(duration: Duration)
{
  let str = '';
  if (Math.floor(duration.asDays()) > 0) {
    str += `${Math.floor(duration.asDays())}d `;
  }
  if (duration.hours() > 0) {
    str += `${duration.hours()}h `;
  }
  if (duration.minutes() > 0) {
    str += `${duration.minutes()}m `;
  }
  return str;
}

const datePickerFormat = "ll";
const timePickerFormat = "LT";

//
// Date and time picker component
//

interface DateTimePickerProps {
  dateTime?: Moment,
  minDate?: Moment,
  iconName?: string
  onTimeUpdated: (date?: Moment) => void,
  includeDuration: boolean,
  label: string,
  localize: any,
}

function DateTimePicker(props: DateTimePickerProps) {

  function getDatePickerStrings(): IDatePickerStrings {
    const localeData = moment.localeData();
    return {
      months: localeData.months(),
      shortMonths: localeData.monthsShort(),
      days: localeData.weekdays(),
      shortDays: localeData.weekdaysMin(),
      goToToday: 'Go to today',
      prevMonthAriaLabel: 'Go to previous month',
      nextMonthAriaLabel: 'Go to next month',
      prevYearAriaLabel: 'Go to previous year',
      nextYearAriaLabel: 'Go to next year',
      closeButtonAriaLabel: 'Close date picker'
    };
  }

  function onDayPicked(date: Date | null | undefined) {
    const currentDateTime = moment(props.dateTime);

    const offsetFromStartOfDay = currentDateTime.diff(moment(currentDateTime).startOf('day'));
    const newDateTime = moment(date ?? currentDateTime).startOf('day').add(offsetFromStartOfDay);

    props.onTimeUpdated(newDateTime);
  }

  function onTimePicked(event: React.FormEvent<IComboBox>, option?: IComboBoxOption, index?: number, value?: string) {
    const currentDateTimeStartOfDay = moment(props.dateTime).startOf('day');

    let newDateTime: moment.Moment;
    if (option) {
      const offsetFromStartOfDay = moment.duration(option.key, 'minutes') ;
      newDateTime = currentDateTimeStartOfDay.add(offsetFromStartOfDay);
    } else {
      // User entered a free-form string, try to parse it as a time
      const enteredTime = moment(value, timePickerFormat);
      if (enteredTime.isValid()) {
        const offsetFromStartOfDay = enteredTime.diff(moment(enteredTime).startOf('day')) ;
        newDateTime = currentDateTimeStartOfDay.add(offsetFromStartOfDay);
      } else {
        newDateTime = moment(props.dateTime);
      }
    }

    props.onTimeUpdated(newDateTime);
  }

  function onFormatDate(dateToFormat?: Date): string {
    return moment(dateToFormat).format(datePickerFormat);
  };

  function onParseDateFromString(value: string): Date {
    return moment(value, datePickerFormat).toDate();
  };

  const timeSuggestions = _.range(0, 1440, 30)
    .map((minutes) => {
      // if the selection is before the min value
      const projectedEndTime = moment(props.dateTime).startOf('day').add(moment.duration(minutes, 'minutes'));
      const isDisabled = moment(props.minDate).isAfter(projectedEndTime);
      const timeTag = moment().startOf('day').minutes(minutes).format(timePickerFormat);
      const projectedDuration = moment.duration(moment(projectedEndTime).diff(props.minDate));
      const projectedDurationString = _.trim(formatDuration(projectedDuration));
      return ({
        key: minutes,
        text: props.includeDuration && !isDisabled && projectedDurationString.length > 0 ? `${timeTag} (${projectedDurationString})` : timeTag,
        disabled: isDisabled
      })
    });

  return (
    <div>
      <Label required={true}>{props.label}</Label>
      <Stack horizontal>
        <DatePicker
          className="newMeetingDatePicker"
          borderless
          firstDayOfWeek={moment.localeData().firstDayOfWeek() as DayOfWeek}
          strings={getDatePickerStrings()}
          ariaLabel="Select a date"
          value={props.dateTime?.toDate()}
          formatDate={onFormatDate}
          parseDateFromString={onParseDateFromString}
          onSelectDate={onDayPicked}
          minDate={props.minDate?.toDate()}
        />
        <ComboBox
          ariaLabel={props.localize.translate('ivsCreator.timePickerAria')}
          className="newMeetingComboBox"
          styles={{ root: { maxHeight: '500px' }}}
          useComboBoxAsMenuWidth={!props.includeDuration}
          scrollSelectedToTop={true}
          allowFreeform={true}
          autoComplete="on"
          options={timeSuggestions}
          onChange={onTimePicked}
          text={props.dateTime?.format(timePickerFormat)}
        />
      </Stack>
    </div>
  );
}


//
// Meeting page component
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
      ? getErrorMessage('Meeting title')(state.meeting.inputMeeting.name)
      : 'Invalid title',
    invalidDescription: hasValidDescription(state.meeting.inputMeeting)
      ? getErrorMessage('Description')(state.meeting.inputMeeting.description)
      : 'Invalid description'
  },
});

const goToLinkPage = (dispatch: Dispatch, meeting: OnlineMeetingInput) => {
  const title = encodeURIComponent(meeting.name || '');
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

  function onSubjectChanged(newValue: string | undefined)
  {
    // The meeting objects are small, cloning is cheap enough
    // Normally would use immutable records or similar to avoid overhead.
    const nextMeeting = _.cloneDeep(props.meeting);
    nextMeeting.name = newValue ?? '';
    props.setMeeting(nextMeeting);
  }

  function onDescriptionChanged(newValue: string | undefined)
  {
    const nextMeeting = _.cloneDeep(props.meeting);
    nextMeeting.description = newValue ?? '';
    props.setMeeting(nextMeeting);
  }

  function onStartDateSelected(date?: Moment)
  {
    const nextMeeting = _.cloneDeep(props.meeting);
    nextMeeting.startDateTime = date ?? nextMeeting.startDateTime;

    // If start >= end, adjust to be the same delta as before from the start time
    if (nextMeeting.startDateTime.isSameOrAfter(nextMeeting.endDateTime)) {
      const existingDelta = moment(props.meeting.endDateTime).diff(moment(props.meeting.startDateTime));
      const newEndDateTime = moment(nextMeeting.startDateTime).add(existingDelta);
      if (nextMeeting.startDateTime.isSameOrAfter(newEndDateTime)) {
        newEndDateTime.add(existingDelta);
      }
      nextMeeting.endDateTime = newEndDateTime;
    }

    props.setMeeting(nextMeeting);
  }

  function onEndDateSelected(date?: Moment)
  {
    const nextMeeting = _.cloneDeep(props.meeting);
    const newEndDateTime = date ?? nextMeeting.endDateTime;

    // Allow the change only if it maintains start < end
    if (!nextMeeting.startDateTime.isAfter(newEndDateTime)) {
      nextMeeting.endDateTime = newEndDateTime;
    }

    props.setMeeting(nextMeeting);
  }

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

    const meetingId = uuidv4();
    const meetingUrl = `https://g.co/meet/${meetingId}`;

    // Send request to the Node server to send the meeting to Learn
    const requestBody = {
      "startDateTime": meeting.startDateTime.toISOString(),
      "endDateTime": meeting.endDateTime.toISOString(),
      "name": meeting?.name,
      "description": meeting?.description,
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


  if (props.creationInProgress) {
    return (
      <div className="spinnerContainer">
        <Spinner size={SpinnerSize.large} />
      </div>
    )
  }

  const StartDateTimePicker = () => <DateTimePicker
    dateTime={props.meeting.startDateTime}
    minDate={moment()}
    onTimeUpdated={onStartDateSelected}
    includeDuration={false}
    iconName="ReplyAlt"
    label={props.localize.translate('ivsCreator.start')}
    localize={props.localize}
  />;

  const EndDateTimePicker = () => <DateTimePicker
    dateTime={props.meeting.endDateTime}
    minDate={props.meeting.startDateTime}
    onTimeUpdated={onEndDateSelected}
    includeDuration={true}
    label={props.localize.translate('ivsCreator.end')}
    localize={props.localize}
  />;

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
              <TextField
                analyticsId="ivsCreator.createMeeting.meetingTitle.input.text"
                className="newMeetingInput"
                ariaLabel={props.localize.translate('ivsCreator.meetingTitle')}
                label={props.localize.translate('ivsCreator.meetingTitle')}
                required={true}
                maxLength={255}
                value={props.meeting?.name}
                onChanged={onSubjectChanged}
                errorMessage={validationEnabled ? props.validationFailures.invalidTitle : undefined}
              />
            </StackItem>
          </div>
        </Stack>

        <div className="newMeetingDatePickerContainer desktop-only">
          <div className="newMeetingPicker">
            <Stack horizontal>
              { StartDateTimePicker() }
              { EndDateTimePicker() }
            </Stack>
          </div>
        </div>
        <div className="newMeetingDatePickerContainer mobile-only">
          <div className="newMeetingPicker">
            <Stack grow>
              { StartDateTimePicker() }
            </Stack>
          </div>
        </div>
        <div className="newMeetingDatePickerContainer mobile-only">
          <div className="newMeetingPicker">
            <Stack grow>
              { EndDateTimePicker() }
            </Stack>
          </div>
        </div>
        <Stack>
          <div className="textfield-container description">
            <StackItem grow>
              <TextField
                analyticsId="ivsCreator.createMeeting.description.input.text"
                className="newMeetingInput"
                ariaLabel={props.localize.translate('ivsCreator.description')}
                label={props.localize.translate('ivsCreator.description')}
                required={true}
                multiline
                maxLength={255}
                resizable={ false }
                value={props.meeting?.description}
                onChanged={onDescriptionChanged}
                errorMessage={validationEnabled ? props.validationFailures.invalidDescription : undefined}
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
