import axios from 'axios';
import config from '../config/config';

exports.loadStreams = async (courseId) => {
  // get OAuth token, make REST API call
  console.log(`loadStreams for ${courseId}`);

  const xhrConfig = {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };

  return mockStreams;
};


const mockStreams =
[
  {
    'selected': true,
    'name': 'Test-Channel',
    'key': 'svs.dgffh51yw1ojxsvgbzpqkamknkuufh',
    'playbackUrl': 'https://usher.ttvnw.net/api/lvs/hls/lvs.874972061024.Test-Channel.m3u8?allow_source=true&player_backend=mediaplayer',
    'ingestUrl': 'rtmp://rtmplive.twitch.tv/app/svs.dgffh51yw1ojxsvgbzpqkamknkuufh'
  }
];