import styled from 'styled-components/primitives';
import { ButtonPressAnimation } from '../animations';
import { padding } from '@rainbow-me/styles';

const HeaderButton = styled(ButtonPressAnimation).attrs(
  ({ scaleTo = 0.8 }) => ({
    compensateForTransformOrigin: true,
    scaleTo,
  })
)`
  ${padding(10, 19, 8)};
`;

export default HeaderButton;
