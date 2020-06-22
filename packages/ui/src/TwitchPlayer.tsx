import React, { useRef, useLayoutEffect } from 'react';
import {localizedComponentWrapper} from "react-babelfish";

interface ITwitchPlayerProps {
  streamUrl: string | undefined;
}

const TwitchPlayer = (props: ITwitchPlayerProps) => {
  const playerElement = useRef(null);
  useLayoutEffect(() => {
    // @ts-ignore
    const player = window.MediaPlayer.create({});
    player.attachHTMLVideoElement(playerElement.current);
    player.setAutoplay(true);
    player.load(props.streamUrl);
  }, [playerElement, props.streamUrl]);
  return (<video id="twitch-player" className="twitch-player" width="600" height="400" controls ref={playerElement}></video>);
}

export default TwitchPlayer;


