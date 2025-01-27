import React from 'react';
import { Platform } from 'react-native';
import styled from 'styled-components/primitives';
import { magicMemo } from '../../utils';
import { OpacityToggler } from '../animations';
import { Text } from '../text';
import { colors } from '@rainbow-me/styles';

const LabelText = styled(Text).attrs({
  color: colors.alpha(colors.blueGreyDark, 0.6),
  letterSpacing: 'roundedTight',
  size: 'lmedium',
  weight: 'semibold',
})`
  position: absolute;
  top: ${Platform.OS === 'android' ? -15.25 : -10.25};
`;

const CoinDividerButtonLabel = ({ isVisible, label }) => (
  <OpacityToggler isVisible={isVisible}>
    <LabelText>{label}</LabelText>
  </OpacityToggler>
);

export default magicMemo(CoinDividerButtonLabel, 'isVisible');
