import MaskedView from '@react-native-community/masked-view';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import Reanimated, {
  Clock,
  Easing as REasing,
  Value as RValue,
  timing,
} from 'react-native-reanimated';
import { useValue } from 'react-native-redash';
import styled from 'styled-components/native';
import { useMemoOne } from 'use-memo-one';
import { ButtonPressAnimation } from '../components/animations';
import RainbowText from '../components/icons/svg/RainbowText';
import { RowWithMargins } from '../components/layout';
import { Emoji, Text } from '../components/text';
import { fetchUserDataFromCloud } from '../handlers/cloudBackup';
import useHideSplashScreen from '../helpers/hideSplashScreen';
import { logger } from '../utils';
import Routes from '@rainbow-me/routes';
import { colors, shadow } from '@rainbow-me/styles';

const {
  and,
  block,
  clockRunning,
  color,
  not,
  set,
  cond,
  interpolate,
  round,
  divide,
  startClock,
} = Reanimated;

const ButtonContainer = styled(Reanimated.View)`
  border-radius: ${({ height }) => height / 2};
`;

const ButtonContent = styled(RowWithMargins).attrs({
  align: 'center',
  margin: 4,
})`
  align-self: center;
  height: 100%;
  padding-bottom: 4;
`;

const ButtonLabel = styled(Text).attrs(
  ({ textColor: color = colors.dark }) => ({
    align: 'center',
    color,
    size: 'larger',
    weight: 'bold',
  })
)``;

const ButtonEmoji = styled(Emoji).attrs({
  align: 'center',
  size: 16.25,
})`
  padding-bottom: 1.5px;
`;

const DarkShadow = styled(Reanimated.View)`
  ${shadow.build(0, 10, 30, colors.dark, 1)};
  background-color: ${colors.white};
  border-radius: 30;
  height: 60;
  left: -3;
  opacity: 0.2;
  position: absolute;
  top: -3;
  width: 236;
`;

const Shadow = styled(Reanimated.View)`
  ${shadow.build(0, 5, 15, colors.dark, 0.4)};
  border-radius: 30;
  height: 60;
  left: -3;
  position: absolute;
  top: -3;
  width: 236;
`;

const RainbowButton = ({
  darkShadowStyle,
  emoji,
  height,
  onPress,
  shadowStyle,
  style,
  textColor,
  text,
}) => {
  return (
    <ButtonPressAnimation onPress={onPress} scaleTo={0.9}>
      <DarkShadow style={darkShadowStyle} />
      <Shadow style={shadowStyle} />
      <ButtonContainer height={height} style={style}>
        <ButtonContent>
          <ButtonEmoji name={emoji} />
          <ButtonLabel textColor={textColor}>{text}</ButtonLabel>
        </ButtonContent>
      </ButtonContainer>
    </ButtonPressAnimation>
  );
};

const Container = styled.View`
  ${StyleSheet.absoluteFillObject};
  align-items: center;
  background-color: ${colors.white};
  justify-content: center;
`;

const ContentWrapper = styled(Animated.View)`
  align-items: center;
  height: 192;
  justify-content: space-between;
  margin-bottom: 20;
  z-index: 10;
`;

const ButtonWrapper = styled(Animated.View)`
  width: 100%;
`;

const INITIAL_SIZE = 375;

export const useAnimatedValue = initialValue => {
  const value = useRef();

  if (!value.current) {
    value.current = new Animated.Value(initialValue);
  }

  return value;
};

const rainbows = [
  {
    delay: 0,
    id: 'grey',
    rotate: '150deg',
    scale: 0.5066666667,
    source: { uri: 'greyneon' },
    x: -116,
    y: -202,
  },
  {
    delay: 20,
    id: 'neon',
    rotate: '394.75deg',
    scale: 0.3333333333,
    source: { uri: 'neon' },
    x: 149,
    y: 380,
  },
  {
    delay: 40,
    id: 'pixel',
    rotate: '360deg',
    scale: 0.6666666667,
    source: { uri: 'pixel' },
    x: 173,
    y: -263,
  },
  {
    delay: 60,
    id: 'light',
    rotate: '-33deg',
    scale: 0.2826666667,
    source: { uri: 'light' },
    x: -172,
    y: 180,
  },
  {
    delay: 80,
    id: 'liquid',
    rotate: '75deg',
    scale: 0.42248,
    source: { uri: 'liquid' },
    x: 40,
    y: 215,
  },
];

const traversedRainbows = rainbows.map(
  (
    {
      delay,
      initialRotate = '0deg',
      rotate = '0deg',
      scale = 1,
      source,
      x = 0,
      y = 0,
    },
    index
  ) => {
    const animatedValue = new Animated.Value(0);
    return {
      delay,
      id: index,
      source,
      style: {
        opacity: animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        }),
        transform: [
          {
            translateX: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, x],
            }),
          },
          {
            translateY: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, y],
            }),
          },
          {
            rotate: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [initialRotate, rotate],
            }),
          },
          {
            scale: animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, scale],
            }),
          },
        ],
      },
      value: animatedValue,
    };
  }
);

const RainbowImage = styled(Animated.Image)`
  height: ${INITIAL_SIZE};
  position: absolute;
  width: ${INITIAL_SIZE};
`;

const RAINBOW_TEXT_HEIGHT = 32;
const RAINBOW_TEXT_WIDTH = 125;

const RainbowTextMask = styled(Reanimated.View)`
  height: ${RAINBOW_TEXT_HEIGHT};
  width: ${RAINBOW_TEXT_WIDTH};
`;

function runTiming(value) {
  const clock = new Clock();
  const state = {
    finished: new RValue(0),
    frameTime: new RValue(0),
    position: new RValue(0),
    time: new RValue(0),
  };

  const config = {
    duration: 2500,
    easing: REasing.linear,
    toValue: new RValue(1),
  };

  return block([
    cond(and(not(state.finished), clockRunning(clock)), 0, [
      set(state.finished, 0),
      set(state.time, 0),
      set(state.position, value),
      set(state.frameTime, 0),
      set(config.toValue, 5),
      startClock(clock),
    ]),
    timing(clock, state, config),
    state.position,
  ]);
}

/* eslint-disable sort-keys */
const colorsRGB = [
  { r: 255, g: 73, b: 74 },
  { r: 255, g: 170, b: 0 },
  { r: 0, g: 222, b: 111 },
  { r: 0, g: 163, b: 217 },
  { r: 115, g: 92, b: 255 },
];
/* eslint-enable sort-keys */

const colorRGB = (r, g, b, fromShadow) =>
  // from some reason there's a different bit shifting with shadows
  fromShadow
    ? color(round(g), round(b), 255, divide(round(r), 256))
    : color(round(r), round(g), round(b));

const springConfig = {
  bounciness: 7.30332,
  speed: 0.6021408,
  toValue: 1,
  useNativeDriver: true,
};

function colorAnimation(rValue, fromShadow) {
  const animation = runTiming(rValue.current);
  const r = interpolate(animation, {
    inputRange: [0, 1, 2, 3, 4, 5],
    outputRange: [...colorsRGB.map(({ r }) => r), colorsRGB[0].r],
  });

  const g = interpolate(animation, {
    inputRange: [0, 1, 2, 3, 4, 5],
    outputRange: [...colorsRGB.map(({ g }) => g), colorsRGB[0].g],
  });

  const b = interpolate(animation, {
    inputRange: [0, 1, 2, 3, 4, 5],
    outputRange: [...colorsRGB.map(({ b }) => b), colorsRGB[0].b],
  });
  return colorRGB(r, g, b, fromShadow);
}

export default function WelcomeScreen() {
  const { replace, navigate } = useNavigation();
  const contentAnimation = useAnimatedValue(1);
  const hideSplashScreen = useHideSplashScreen();
  const createWalletButtonAnimation = useAnimatedValue(1);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const isSimulator = await DeviceInfo.isEmulator();
        if (!isSimulator && Platform.OS === 'ios') {
          logger.log('downloading cloud backup info...');
          const data = await fetchUserDataFromCloud();
          setUserData(data);
          logger.log('Downloaded cloud backup info');
        }
      } catch (e) {
        logger.log('error getting userData', e);
      } finally {
        hideSplashScreen();
        Animated.parallel([
          ...traversedRainbows.map(({ value, delay = 0 }) =>
            Animated.spring(value, { ...springConfig, delay })
          ),
          Animated.sequence([
            Animated.timing(contentAnimation.current, {
              duration: 120,
              easing: Easing.bezier(0.165, 0.84, 0.44, 1),
              toValue: 1.2,
            }),
            Animated.spring(contentAnimation.current, {
              friction: 8,
              tension: 100,
              toValue: 1,
            }),
          ]),
          Animated.loop(
            Animated.sequence([
              Animated.timing(createWalletButtonAnimation.current, {
                duration: 1000,
                toValue: 1.02,
                useNativeDriver: true,
              }),
              Animated.timing(createWalletButtonAnimation.current, {
                duration: 1000,
                toValue: 0.98,
                useNativeDriver: true,
              }),
            ])
          ),
        ]).start();
      }
    };
    initialize();

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      createWalletButtonAnimation.current.setValue(1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      contentAnimation.current.setValue(1);
    };
  }, [contentAnimation, hideSplashScreen, createWalletButtonAnimation]);

  const buttonStyle = useMemoOne(
    () => ({
      transform: [{ scale: createWalletButtonAnimation.current }],
      zIndex: 10,
    }),
    [createWalletButtonAnimation]
  );

  const contentStyle = useMemoOne(
    () => ({
      transform: [
        {
          scale: contentAnimation.current,
        },
      ],
    }),
    [createWalletButtonAnimation]
  );

  const rValue = useValue(0);

  const backgroundColor = useMemoOne(() => colorAnimation(rValue, false), []);

  const onCreateWallet = useCallback(async () => {
    replace(Routes.SWIPE_LAYOUT);
  }, [replace]);

  const createWalletButtonProps = useMemoOne(() => {
    const color = colorAnimation(rValue, true);
    return {
      emoji: 'european_castle',
      height: 54,
      shadowStyle: {
        backgroundColor: backgroundColor,
        shadowColor: color,
      },
      style: {
        backgroundColor: colors.dark,
        borderColor: backgroundColor,
        width: 230,
      },
      text: 'Get a new wallet',
      textColor: colors.white,
    };
  }, [rValue]);

  const showRestoreSheet = useCallback(() => {
    navigate(Routes.RESTORE_SHEET, {
      userData,
    });
  }, [navigate, userData]);

  const existingWalletButtonProps = useMemoOne(() => {
    return {
      darkShadowStyle: {
        opacity: 0,
      },
      emoji: 'old_key',
      height: 56,
      shadowStyle: {
        opacity: 0,
      },
      style: {
        backgroundColor: colors.blueGreyDarkLight,
        width: 248,
      },
      text: 'I already have one',
      textColor: colors.alpha(colors.blueGreyDark, 0.8),
    };
  }, [rValue]);

  const textStyle = useMemoOne(() => {
    return {
      backgroundColor,
    };
  }, [rValue]);

  return (
    <Container>
      {traversedRainbows.map(({ source, style, id }) => (
        <RainbowImage key={`rainbow${id}`} source={source} style={style} />
      ))}

      <ContentWrapper style={contentStyle}>
        <MaskedView maskElement={<RainbowText />}>
          <RainbowTextMask style={textStyle} />
        </MaskedView>

        <ButtonWrapper style={buttonStyle}>
          <RainbowButton
            onPress={onCreateWallet}
            {...createWalletButtonProps}
          />
        </ButtonWrapper>
        <ButtonWrapper>
          <RainbowButton
            onPress={showRestoreSheet}
            {...existingWalletButtonProps}
          />
        </ButtonWrapper>
      </ContentWrapper>
    </Container>
  );
}
