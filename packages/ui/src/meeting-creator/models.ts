import moment from "moment";
import { Moment } from "moment";

export interface OnlineMeetingInput {
    subject?: string,
    description?: string,
    startDateTime: Moment,
    endDateTime: Moment,
}

export function createDefaultMeetingInput(): OnlineMeetingInput {
    return {
        subject: "",
        description: "",
        startDateTime: moment().startOf('hour').add(1, 'hour'),
        endDateTime: moment().startOf('hour').add(2, 'hour'),
    };
}
