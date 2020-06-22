import moment from "moment";
import { Moment } from "moment";

export interface IStream {
    selected: boolean,
    name: string,
    key: string,
    ingestUrl: string,
    playbackUrl: string
}

export interface OnlineMeetingInput {
    name: string,
    description?: string,
    startDateTime: Moment,
    endDateTime: Moment,
}

export function createDefaultMeetingInput(): OnlineMeetingInput {
    return {
        name: "",
        description: "",
        startDateTime: moment().startOf('hour').add(1, 'hour'),
        endDateTime: moment().startOf('hour').add(2, 'hour'),
    };
}
