import React from 'react';
import Test from '../src/example';
import renderer from 'react-test-renderer';
 
test('Renders snapshot as expected', () => {
        const tree = renderer.create(<Test />).toJSON();
        expect(tree).toMatchSnapshot();
});