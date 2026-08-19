import { render } from '@testing-library/react-native';

import { AppText } from '../src/components/AppText';

describe('AppText', () => {
  it('renders shared text content', async () => {
    const screen = await render(<AppText>TripWise</AppText>);

    expect(screen.getByText('TripWise')).toBeTruthy();
  });
});
