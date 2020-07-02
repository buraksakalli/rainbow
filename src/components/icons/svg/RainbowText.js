import PropTypes from 'prop-types';
import React from 'react';
import { Path } from 'react-native-svg';
import Svg from '../Svg';
import { colors } from '@rainbow-me/styles';

const RainbowText = ({ color, ...props }) => (
  <Svg height="25" width="125" viewBox="0 0 125 25" {...props}>
    <Path
      xmlns="http://www.w3.org/2000/svg"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M32.6134 0.5V5.33162H37.9941V0.5H32.6134ZM12.0425 7.5278L11.713 12.4692C10.8712 11.9934 10.0659 11.8104 8.93118 11.8104C6.73499 11.8104 5.27086 13.0549 5.27086 15.8733V23.56H0V7.30818H5.27086V10.273C5.89312 8.44288 7.57687 6.86894 9.77306 6.86894C10.7613 6.86894 11.6032 7.16177 12.0425 7.5278ZM23.2062 16.6786V16.3492L20.5342 16.8982C18.887 17.2277 17.8622 17.6303 17.8622 18.9114C17.8622 19.8631 18.5942 20.4487 19.7289 20.4487C21.6689 20.4487 23.2062 18.9846 23.2062 16.6786ZM28.4041 19.131V13.2013C28.4041 8.77231 25.3661 6.86894 21.1201 6.86894C16.4715 6.86894 13.8727 9.28476 13.3236 12.7621L18.2284 13.1281C18.5213 11.7738 19.2899 10.8221 20.8273 10.8221C22.4378 10.8221 23.2065 11.7372 23.2065 13.2745V13.5673L18.6677 14.3726C15.0806 15.0681 12.738 16.3858 12.738 19.4971C12.738 22.2789 14.7877 23.926 18.0454 23.926C20.571 23.926 22.5842 22.9378 23.4993 21.071C23.9751 22.9012 25.4027 23.926 27.3426 23.926C28.9532 23.926 29.9781 23.4502 30.7833 22.8646V20.0461C30.3075 20.2657 29.9049 20.3389 29.429 20.3389C28.7702 20.3389 28.4041 19.9729 28.4041 19.131ZM32.6502 7.3082H37.9211V23.56H32.6502V7.3082ZM46.6324 15.2877V23.56H41.3616V7.30818H46.6324V9.83381C47.5109 8.04025 49.4875 6.86894 51.9399 6.86894C56.3323 6.86894 57.7964 9.90701 57.7964 13.3843V23.56H52.5255V14.6654C52.5255 12.3228 51.7569 11.0417 49.8169 11.0417C47.6939 11.0417 46.6324 12.7255 46.6324 15.2877ZM66.3255 15.6171V15.2511C66.3255 12.6523 67.8262 11.0051 70.0224 11.0051C72.5114 11.0051 73.7193 12.7987 73.7193 15.4341C73.7193 18.1061 72.5114 19.8997 70.0224 19.8997C67.8262 19.8997 66.3255 18.2526 66.3255 15.6171ZM66.0687 20.6318L65.117 23.56H61.0541V0.5H66.3249V10.2365C67.1302 8.29649 68.997 6.86896 71.8154 6.86896C76.5738 6.86896 79.0629 10.6757 79.0629 15.4341C79.0629 20.2291 76.5738 23.9993 71.7056 23.9993C68.997 23.9993 66.9472 22.6083 66.0687 20.6318ZM89.5314 20.0095C87.1888 20.0095 86.1273 18.1428 86.1273 15.4341C86.1273 12.7255 87.1888 10.8587 89.5314 10.8587C91.8374 10.8587 92.9721 12.7255 92.9721 15.4341C92.9721 18.1428 91.8374 20.0095 89.5314 20.0095ZM98.3163 15.4341C98.3163 20.4853 94.7292 23.9993 89.5316 23.9993C84.3339 23.9993 80.7834 20.4853 80.7834 15.4341C80.7834 10.4195 84.3339 6.86894 89.5316 6.86894C94.7292 6.86894 98.3163 10.4195 98.3163 15.4341ZM116.947 17.1911L114.348 7.3082H110.102L107.503 17.1911H107.357L104.245 7.3082H98.9746L104.136 23.56H109.297L111.896 13.7504H112.042L114.677 23.56H119.838L125 7.3082H120.204L117.093 17.1911H116.947Z"
      fill={color}
    />
  </Svg>
);

RainbowText.propTypes = {
  color: PropTypes.string,
};

RainbowText.defaultProps = {
  color: colors.black,
};

export default RainbowText;
