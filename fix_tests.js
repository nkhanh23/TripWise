const fs = require('fs');

let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

// Replace test A:
const testARegex = /it\('exact supersede window', async \(\) => \{[\s\S]*?\}\);/;
const newTestA = `it('exact supersede window', async () => {
    let resolveR1: (val?: any) => void;
    const requestR1 = new Promise((resolve) => { resolveR1 = resolve; });
    let resolveB: (val?: any) => void;
    const requestB = new Promise((resolve) => { resolveB = resolve; });

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

    // Pan A starts request R1
    await act(async () => { fireEvent.press(screen.getByLabelText('Pan A')); });
    await advanceDebounce(400);
    expect(discover).toHaveBeenCalledTimes(2);

    // Settle Pan B before R1 resolves
    await act(async () => { fireEvent.press(screen.getByLabelText('Pan B')); });
    await advanceDebounce(100);
    expect(discover).toHaveBeenCalledTimes(2); // no premature call

    await act(async () => {
      resolveR1([stalePlace]);
      await Promise.resolve();
    });

    expect(screen.queryByText('Stale Viewport A')).toBeNull();
    expect(screen.getByText('Wat Arun')).toBeTruthy();

    await advanceDebounce(300);
    expect(discover).toHaveBeenCalledTimes(3); // exactly one B call

    await act(async () => {
      resolveB([restaurant]);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText('Real Restaurant')).toBeTruthy());
    expect(screen.queryByText('Wat Arun')).toBeNull(); // B authoritative
  });`;

text = text.replace(testARegex, newTestA);

// Replace test E:
const testERegex = /it\('background refresh failure keeps last confirmed markers', async \(\) => \{[\s\S]*?\}\);/;
const newTestE = `it('background refresh failure keeps last confirmed markers', async () => {
    let rejectDiscover: ((val?: any) => void) | undefined;
    const discover = jest.fn()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => new Promise((_, r) => { rejectDiscover = r; }));

    await render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());

    await act(async () => { fireEvent.press(screen.getByLabelText('Pan A')); });
    await advanceDebounce();
    
    await act(async () => {
      rejectDiscover!(new Error('network'));
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());
    expect(screen.queryByText('Unable to load map')).toBeNull();
    expect(screen.getByLabelText('Thử lại tải dữ liệu bản đồ')).toBeTruthy();
  });`;

text = text.replace(testERegex, newTestE);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Fixed ExploreProductionScreen.test.tsx');
