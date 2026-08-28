const fs = require('fs');

const text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

const testA = `
  it('exact supersede window', async () => {
    let resolveR1: (val?: any) => void;
    const requestR1 = new Promise((resolve) => { resolveR1 = resolve; });
    let resolveB: (val?: any) => void;
    const requestB = new Promise((resolve) => { resolveB = resolve; });

    const attraction = {
      id: 'a1',
      googlePlaceId: 'g1',
      name: 'Wat Arun',
      category: 'attractions',
      categoryLabel: 'Attraction',
      iconName: 'attractions',
      coordinate: { latitude: 1, longitude: 1 }
    };
    const restaurant = {
      id: 'r1',
      googlePlaceId: 'r1',
      name: 'Real Restaurant',
      category: 'restaurants',
      categoryLabel: 'Restaurant',
      iconName: 'restaurant',
      coordinate: { latitude: 2, longitude: 2 }
    };
    const stalePlace = {
      ...attraction,
      id: 'stale-id',
      googlePlaceId: 'stale-id',
      name: 'Stale Viewport A',
    };

    const discover = jest.fn()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => requestR1)
      .mockImplementationOnce(() => requestB);

    await render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByLabelText('Pan A')); });
    await act(async () => { jest.advanceTimersByTime(400); });
    expect(discover).toHaveBeenCalledTimes(2);

    await act(async () => { fireEvent.press(screen.getByLabelText('Pan B')); });
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(discover).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveR1([stalePlace]);
      await Promise.resolve();
    });

    expect(screen.queryByText('Stale Viewport A')).toBeNull();
    expect(screen.getByText('Wat Arun')).toBeTruthy();

    await act(async () => { jest.advanceTimersByTime(300); });
    expect(discover).toHaveBeenCalledTimes(3);

    await act(async () => {
      resolveB([restaurant]);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText('Real Restaurant')).toBeTruthy());
    expect(screen.queryByText('Wat Arun')).toBeNull();
  });
`;

const testE = `
  it('background refresh failure keeps last confirmed markers', async () => {
    const attraction = {
      id: 'a1',
      googlePlaceId: 'g1',
      name: 'Wat Arun',
      category: 'attractions',
      categoryLabel: 'Attraction',
      iconName: 'attractions',
      coordinate: { latitude: 1, longitude: 1 }
    };
    let rejectDiscover: ((val?: any) => void) | undefined;
    const discover = jest.fn()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => new Promise((_, r) => { rejectDiscover = r; }));

    await render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByLabelText('Pan A')); });
    await act(async () => { jest.advanceTimersByTime(400); });
    
    await act(async () => {
      rejectDiscover!(new Error('network'));
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());
    expect(screen.queryByText('Unable to load map')).toBeNull();
    expect(screen.getByLabelText('Thử lại tải dữ liệu bản đồ')).toBeTruthy();
  });
`;

const parts = text.split('});\n');
if (parts.length >= 2) {
    const lastPart = parts.pop();
    const joined = parts.join('});\n') + '});\n' + testA + testE + '\n});\n';
    fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', joined);
}
console.log('Appended tests');
