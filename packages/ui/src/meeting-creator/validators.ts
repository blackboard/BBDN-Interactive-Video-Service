import { OnlineMeetingInput } from "./models";

export function hasValidSubject(meeting : OnlineMeetingInput)
{
    return !!meeting.name &&
        meeting.name.length >= 0
}

export function hasValidDescription(meeting : OnlineMeetingInput)
{
    return !!meeting.description &&
      meeting.description.length >= 0
}
