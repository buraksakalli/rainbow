import PropTypes from 'prop-types';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Row } from '../layout';
import { Rounded } from '../text';

const sx = StyleSheet.create({
  cents: {
    marginLeft: 1,
    top: 7,
  },
});

const DollarFigure = ({ value = '0.00' }) => {
  const [dollars, cents = '00'] = value.split('.');

  return (
    <Row>
      <Rounded letterSpacing={0.2} size="h1" weight="heavy">
        {dollars.charAt(0) === '$' ? dollars : `$${dollars}`}
      </Rounded>
      <Rounded letterSpacing={0.1} size="large" style={sx.cents} weight="heavy">
        {`.${cents}`}
      </Rounded>
    </Row>
  );
};

DollarFigure.propTypes = {
  value: PropTypes.string,
};

export default React.memo(DollarFigure);
