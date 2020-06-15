import { Middleware } from "redux";
import { createMeetingService } from "./service";
import { push } from "connected-react-router";

export function createMeetingMiddleware() : Middleware
{
    const service = createMeetingService();

    return store => next => action => {

        next(action);
    }
}
