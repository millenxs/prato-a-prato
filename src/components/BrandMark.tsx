import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../theme';

export function BrandMark() {
  return <Svg width={30} height={30} viewBox="0 0 512 512" accessibilityElementsHidden>
    <Path d="M380 176a148 148 0 1 0 24 80" fill="none" stroke={colors.onAccent} strokeWidth={24} strokeLinecap="round" />
    <Path d="M324 216a78 78 0 1 0 10 40" fill="none" stroke={colors.onAccent} strokeWidth={24} strokeLinecap="round" />
    <Circle cx={396} cy={136} r={20} fill={colors.onAccent} />
  </Svg>;
}
