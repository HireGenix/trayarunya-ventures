'use client';

import React from 'react';
import { SvgIconProps } from '@mui/material';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import MovieFilterIcon from '@mui/icons-material/MovieFilter';
import CampaignIcon from '@mui/icons-material/Campaign';
import HubIcon from '@mui/icons-material/Hub';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ShareIcon from '@mui/icons-material/Share';

const map: Record<string, React.ComponentType<SvgIconProps>> = {
  linkedin: LinkedInIcon,
  demand: RocketLaunchIcon,
  branding: RecordVoiceOverIcon,
  creative: MovieFilterIcon,
  ads: CampaignIcon,
  strategy: HubIcon,
  graph: AutoGraphIcon,
  ai: AutoAwesomeIcon,
  seo: TravelExploreIcon,
  social: ShareIcon,
};

const ServiceIcon = ({ name, ...props }: { name: string } & SvgIconProps) => {
  const Icon = map[name] ?? AutoGraphIcon;
  return <Icon {...props} />;
};

export default ServiceIcon;
