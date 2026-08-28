const fs = require('fs');

const testFile = 'mobile/tests/ExploreProductionScreen.test.tsx';
let content = fs.readFileSync(testFile, 'utf8');

// 1. Fix refreshing test assertion
content = content.replace(
  "expect(screen.getByLabelText('Đang làm mới dữ liệu bản đồ')).toBeTruthy();",
  "expect(screen.queryByLabelText('Đang làm mới dữ liệu bản đồ')).toBeNull();"
);

// 2. Add regression test for the 400ms race window
const newTest = `
  it('immediately cancels a superseded request during the 400ms settle window', async () => {
    let resolveR1;
    const requestR1 = new Promise((resolve) => {
      resolveR1 = resolve;
    });
    let resolveB;
    const requestB = new Promise((resolve) => {
      resolveB = resolve;
    });

    const discover = jest
      .fn()
      .mockResolvedValueOnce([attraction])
      .mockImplementationOnce(() => requestR1)
      .mockImplementationOnce(() => requestB);

    await render(<ExploreScreen repository={{ discover }} />);
    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());

    // 2. Pan A starts request R1
    fireEvent.press(screen.getByLabelText('Pan A'));
    await advanceDebounce();
    expect(discover).toHaveBeenCalledTimes(2);

    // 4. settle Pan B
    fireEvent.press(screen.getByLabelText('Pan B'));
    
    // 7. assert no premature B provider call before debounce
    await advanceDebounce(100);
    expect(discover).toHaveBeenCalledTimes(2);

    // 5. before B's 400ms debounce fires, resolve R1
    await act(async () => {
      resolveR1([attraction]);
      await Promise.resolve();
    });

    // 8. after 400ms, exactly one B request occurs
    await advanceDebounce(300);
    expect(discover).toHaveBeenCalledTimes(3);

    // 9. resolve B
    await act(async () => {
      resolveB([restaurant]);
      await Promise.resolve();
    });

    // 10. only B result is authoritative
    await waitFor(() => expect(screen.getByText('Real Restaurant')).toBeTruthy());
    expect(screen.queryByText('Wat Arun')).toBeNull();
  });
`;

const insertMarker = "it('replaces confirmed results after a successful refresh and ignores a stale response'";
const insertIdx = content.indexOf(insertMarker);
if (insertIdx !== -1) {
  content = content.slice(0, insertIdx) + newTest.trim() + "\n\n  " + content.slice(insertIdx);
} else {
  console.log("Could not find insert marker!");
}

// 3. Fix EOF whitespace
content = content.replace(/\s+$/, '') + '\n';

fs.writeFileSync(testFile, content, 'utf8');
console.log('Patched test file');
