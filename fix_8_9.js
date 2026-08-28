const fs = require('fs');
let text = fs.readFileSync('mobile/tests/ExploreProductionScreen.test.tsx', 'utf8');

// Fix Test 8
text = text.replace(
  "const discover = jest.fn((req) => new Promise(r => setTimeout(() => r(req.category === 'restaurants' ? [restaurant] : [attraction]), 10)));",
  "let resolveDiscover;\n    const reqPromise = new Promise(r => { resolveDiscover = r; });\n    const discover = jest.fn((req) => reqPromise.then(() => req.category === 'restaurants' ? [restaurant] : [attraction]));"
);
text = text.replace(
  "await render(<ExploreScreen repository={{ discover }} />);\n    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());",
  "await render(<ExploreScreen repository={{ discover }} />);\n    resolveDiscover();\n    await waitFor(() => expect(screen.getByText('Wat Arun')).toBeTruthy());"
);
text = text.replace(
  "fireEvent.press(screen.getByText('Restaurants'));\n    expect(screen.getByTestId('markers-dimmed').props.children).toBe('true');",
  "// Reset the promise for the next call\n    const reqPromise2 = new Promise(r => { resolveDiscover = r; });\n    discover.mockImplementation((req) => reqPromise2.then(() => req.category === 'restaurants' ? [restaurant] : [attraction]));\n\n    fireEvent.press(screen.getByText('Restaurants'));\n    expect(screen.getByTestId('markers-dimmed').props.children).toBe('true');"
);
text = text.replace(
  "await advanceDebounce();\n    await waitFor(() => expect(screen.getByText('Real Restaurant')).toBeTruthy());",
  "resolveDiscover();\n    await advanceDebounce();\n    await waitFor(() => expect(screen.getByText('Real Restaurant')).toBeTruthy());"
);

// Fix Test 9
text = text.replace(
  "const discover = jest.fn()\n      .mockResolvedValueOnce([attraction])\n      .mockRejectedValueOnce(new Error('network'));",
  "let rejectDiscover;\n    const reqPromise = new Promise((_, r) => { rejectDiscover = r; });\n    const discover = jest.fn()\n      .mockResolvedValueOnce([attraction])\n      .mockImplementationOnce(() => reqPromise);"
);
text = text.replace(
  "await act(async () => { fireEvent.press(screen.getByLabelText('Pan A')); });\n    await advanceDebounce();\n    \n    expect(screen.getByTestId('markers-dimmed').props.children).toBe('true');",
  "await act(async () => { fireEvent.press(screen.getByLabelText('Pan A')); });\n    await advanceDebounce();\n    \n    expect(screen.getByTestId('markers-dimmed').props.children).toBe('true');\n    rejectDiscover(new Error('network'));"
);

fs.writeFileSync('mobile/tests/ExploreProductionScreen.test.tsx', text);
console.log('Fixed Test 8 and 9 manually');
