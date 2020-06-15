import { OnlineMeetingInput } from "./models";

export function createMeetingService() {    
    return {
        async createMeeting(meeting: OnlineMeetingInput) {
            const requestBody = {
                "startDateTime": meeting.startDateTime?.toISOString(),
                "endDateTime": meeting.endDateTime?.toISOString(),
                "subject": meeting.subject,
                "description": meeting.description
            };

            return null;
        }
    }
}
