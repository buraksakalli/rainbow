import PropTypes from 'prop-types';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import stylePropType from 'react-style-proptype';
import { useDimensions } from '../../hooks';
import { colors, padding, position } from '../../styles';
import { ButtonPressAnimation } from '../animations';
import { Icon } from '../icons';
import { InnerBorder, RowWithMargins } from '../layout';
import { ShadowStack } from '../shadow-stack';
import { Text } from '../text';

const SheetActionButton = ({
  borderRadius,
  children,
  color,
  icon,
  label,
  onPress,
  shadows,
  style,
  ...props
}) => {
  const { width } = useDimensions();

  console.log('style', style);
  console.log('props', props);

  return (
    <ButtonPressAnimation
      {...props}
      flex={1}
      height={width >= 414 ? 44 : 40}
      onPress={onPress}
      scaleTo={0.96}
      style={[position.centeredAsObject, style]}
    >
      <ShadowStack
        {...position.coverAsObject}
        backgroundColor={color}
        borderRadius={borderRadius}
        shadows={shadows}
      />
      {children || (
        <RowWithMargins
          align="center"
          css={padding(9.5, 14, 11, 15)}
          height={width >= 414 ? 44 : 40}
          margin={4}
          zIndex={1}
        >
          <Icon color="white" name={icon} size={16} height={16} />
          <Text color="white" size="lmedium" weight="semibold">
            {label}
          </Text>
        </RowWithMargins>
      )}
      <InnerBorder radius={borderRadius} />
    </ButtonPressAnimation>
  );
};

SheetActionButton.propTypes = {
  borderRadius: PropTypes.number,
  children: PropTypes.node,
  color: PropTypes.string,
  onPress: PropTypes.func,
  shadows: PropTypes.arrayOf(PropTypes.array),
  style: stylePropType,
};

SheetActionButton.defaultProps = {
  borderRadius: 50,
  // color: 'pink',
  shadows: [
    [0, 2, 5, colors.dark, 0.15],
    [0, 6, 10, colors.dark, 0.14],
    [0, 1, 18, colors.dark, 0.08],
  ],
};

export default SheetActionButton;
