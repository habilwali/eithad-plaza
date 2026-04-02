/**
 * Etihad Channels — same TV UI with dummy data for now.
 * API integration can replace this config later.
 */

import React from 'react';
import ChannelScreen from './ChannelScreen';
import {ETIHAD_CHANNELS_DATA} from '../data/channelData';

export interface EtihadChannelsScreenProps {
  onBack: () => void;
  isActive?: boolean;
}

export default function EtihadChannelsScreen({
  onBack,
  isActive = true,
}: EtihadChannelsScreenProps) {
  return (
    <ChannelScreen
      onBack={onBack}
      isActive={isActive}
      config={ETIHAD_CHANNELS_DATA}
    />
  );
}
