import React from 'react';
import {localizedComponentWrapper} from 'react-babelfish';
import {parameters} from './util/parameters';
import TwitchPlayer from './TwitchPlayer';

const params = parameters.getInstance();

function WatchStreamPageComponent() {
  return (
    <div>
      <TwitchPlayer streamUrl={params.getStreamUrl()}/>
    </div>
  )
}

export default localizedComponentWrapper(WatchStreamPageComponent);
