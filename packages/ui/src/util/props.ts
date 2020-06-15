import { OnlineMeetingInput } from "../meeting-creator/models";

export interface MeetingValidationFailures {
  invalidTitle?: string
  invalidDescription?: string
}

export interface MeetingPageProps {
  meeting: OnlineMeetingInput,
  validationFailures: MeetingValidationFailures
  creationInProgress: boolean
  meetingUrl: string | undefined
  setMeeting: (meeting: OnlineMeetingInput) => void,
  createMeeting: (meeting: OnlineMeetingInput) => void,
  cancel: () => void,
  localize: any,
  location: Location
}
