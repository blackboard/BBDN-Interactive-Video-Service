import axios from 'axios';
import moment from 'moment';
import config from '../config/config';
import ltiAdv from './lti-adv';

exports.createDeepContent = async (meetingInfo, learnInfo, token) => {
  // get OAuth token, make REST API call
  console.log(`createDeepContent meeting: ${JSON.stringify(meetingInfo)}`);
  console.log(`createDeepContent learn: ${JSON.stringify(learnInfo)}`);

  const xhrConfig = {
    headers: {Authorization: `Bearer ${token}`}
  };

  // First we need to get what type of course we've got
  const courseResponse = await axios.get(`${learnInfo.learnHost}/learn/api/public/v2/courses/uuid:${learnInfo.courseId}`, xhrConfig);

  if (courseResponse.status === 200) {
    try {
      console.log(`Got course; Ultra status is ${courseResponse.data.ultraStatus}, and PK1 is: ${courseResponse.data.id}`);

      createCalendarItem(meetingInfo, learnInfo, courseResponse.data.id, xhrConfig);

      // Now create the content item, which differs between Ultra and Original by the "availability" date since Original
      // doesn't have the concept of "partially visible" and we want it to show up in the course before it's ready (or do we?)
      let startDateTime = meetingInfo.startDateTime;
      if (courseResponse.data.ultraStatus !== 'Ultra') {
        // Original experience
        if (meetingInfo.startDateTime) {
          const startTime = moment(meetingInfo.startDateTime).subtract(1, 'hour');
          startDateTime = startTime.toISOString();
          console.log(`Original changing start time to: ${startDateTime}`);
        }
      }

      await createContentItem(meetingInfo, learnInfo, startDateTime, xhrConfig);

      // Now create the deep linking response
      return createDeepLinkJwt(meetingInfo, learnInfo, startDateTime);
    } catch (error) {
      console.log(`Error creating calendar or content ${JSON.stringify(error)}`);
      return null;
    }
  } else {
    // get course info failed
    console.log(`Get course info failed ${JSON.stringify(courseResponse)}`);
    return null;
  }
};

let createCalendarItem = async function (meetingInfo, learnInfo, calendarId, xhrConfig) {
  // We need the course PK1 for the Calendar API
  const calendarOptions = {
    calendarId: calendarId,
    type: 'Course',
    title: meetingInfo.subject,
    location: meetingInfo.description,
    description: meetingInfo.description,
    start: meetingInfo.startDateTime,
    end: meetingInfo.endDateTime
  };

  console.log(`Calendar create options: ${JSON.stringify(calendarOptions)}`);

  const learnUrl = `${learnInfo.learnHost}/learn/api/public/v1/calendars/items`;

  // Create the calendar item
  axios.post(learnUrl, calendarOptions, xhrConfig).then(response => {
    if (response.status === 201) {
      console.log(`Calendar item created successfully!`);
    } else {
      console.log(`Calendar item creation failed ${response.status}`);
    }
  }).catch(error => {
    console.log(`Error creating calendar item: ${JSON.stringify(error?.response?.data)}, from: ${learnInfo.learnHost}`);
  });
};

let createContentItem = async (meetingInfo, learnInfo, startDateTime, xhrConfig) => {
  // The deep linking data field has the content folder parent ID where we want to add the content
  const dlData = learnInfo.deepLinkData.split('::');
  const contentId = dlData[1];
  const position = dlData[2] ? parseInt(dlData[2]) : -1;
  console.log(`createContentItem dlData ${dlData}, contentId: ${contentId}, position: ${position}`);

  let contentCreateOptions = {
    title: meetingInfo.subject,
    description: meetingInfo.description,
    body: meetingInfo.description,
    position: position,
    contentHandler: {
      id: 'resource/x-bb-externallink',
      url: meetingInfo.url
    },
    availability: {
      available: 'PartiallyVisible',
      adaptiveRelease: {
        start: meetingInfo.startDateTime,
        end: meetingInfo.endDateTime
      }
    }
  };

  const learnCreateUltraContentUrl = `${learnInfo.learnHost}/learn/api/public/v1/courses/uuid:${learnInfo.courseId}/contents/${contentId}/children`;

  console.log(`createContentItem options: ${JSON.stringify(contentCreateOptions)}`);
  console.log(`learn URL: ${learnCreateUltraContentUrl}`);

  const response = await axios.post(learnCreateUltraContentUrl, contentCreateOptions, xhrConfig);

  if (response.status === 201) {
    console.log(`Content item created successfully!`);
  } else {
    console.log(`Content item creation failed ${response.status}`);
  }
};

/*
  This is the code for a proper Deep Linking 2.0 response. I don't want to delete it as I think we'll go back to this some day
 */
let createDeepLinkJwt = function (meetingInfo, learnInfo, startDateTime) {
  const contentItem = {
    type: "link",
    title: meetingInfo.subject,
    text: meetingInfo.description,
    url: meetingInfo.url,
    available: {
      startDateTime: startDateTime,
      endDateTime: meetingInfo.endDateTime,
    },
  };

  const now = moment.now() / 1000;
  const deepLinkResponse = {
    iss: config.bbClientId,
    aud: learnInfo.iss,
    sub: config.bbClientId,
    iat: now,
    exp: now + 5 * 60,
    locale: "en_US",
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": learnInfo.deployId,
    "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiDeepLinkingResponse",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti-dl/claim/data": learnInfo.deepLinkData,
    "https://purl.imsglobal.org/spec/lti-dl/claim/content_items": [] // for when it's real [contentItem]
  };

  console.log(`Deep link creator returned: ${JSON.stringify(deepLinkResponse)}`);

  const jwt = ltiAdv.signJwt(deepLinkResponse);

  return jwt;
};
