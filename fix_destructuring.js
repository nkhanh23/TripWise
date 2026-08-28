const fs = require('fs');
let canvasText = fs.readFileSync('mobile/tests/ExploreMapCanvas.test.tsx', 'utf8');

canvasText = canvasText.replace(/import \{ render, fireEvent, act, screen \} from '@testing-library\/react-native';/, "import { render, fireEvent, act } from '@testing-library/react-native';");

// Restore destructurings
canvasText = canvasText.replace(/render\(\n      <ExploreMapCanvas\n        status="ready"\n        markersDimmed=\{false\}\n        markerItems=\{\[\]\}\n        selectedPlaceId=\{null\}\n        onMovementStateChange=\{onMovementStateChange\}\n        onSelectPlace=\{jest\.fn\(\)\}\n        onDismissSelection=\{jest\.fn\(\)\}\n        onRegionChangeComplete=\{onRegionChangeComplete\}\n      \/>\n    \);/, `const { getByTestId } = render(
      <ExploreMapCanvas
        status="ready"
        markersDimmed={false}
        markerItems={[]}
        selectedPlaceId={null}
        onMovementStateChange={onMovementStateChange}
        onSelectPlace={jest.fn()}
        onDismissSelection={jest.fn()}
        onRegionChangeComplete={onRegionChangeComplete}
      />
    );`);

canvasText = canvasText.replace(/const \{ rerender \} = render\(\n      <ExploreMapCanvas\n        status="ready"\n        markersDimmed=\{false\}\n        markerItems=\{\[\]\}\n        selectedPlaceId=\{null\}\n        onMovementStateChange=\{jest\.fn\(\)\}\n        onSelectPlace=\{jest\.fn\(\)\}\n        onDismissSelection=\{jest\.fn\(\)\}\n      \/>\n    \);/g, `const { getAllByTestId, queryAllByTestId, rerender } = render(
      <ExploreMapCanvas
        status="ready"
        markersDimmed={false}
        markerItems={[]}
        selectedPlaceId={null}
        onMovementStateChange={jest.fn()}
        onSelectPlace={jest.fn()}
        onDismissSelection={jest.fn()}
      />
    );`);

canvasText = canvasText.replace(/const \{ rerender \} = render\(\n      <ExploreMapCanvas\n        status="ready"\n        markersDimmed=\{false\}\n        markerItems=\{\[\{ type: 'place', place: mockPlace \}\]\}\n        selectedPlaceId=\{null\}\n        onMovementStateChange=\{jest\.fn\(\)\}\n        onSelectPlace=\{onSelectPlace\}\n        onDismissSelection=\{jest\.fn\(\)\}\n      \/>\n    \);/g, `const { getByLabelText, rerender } = render(
      <ExploreMapCanvas
        status="ready"
        markersDimmed={false}
        markerItems={[{ type: 'place', place: mockPlace }]}
        selectedPlaceId={null}
        onMovementStateChange={jest.fn()}
        onSelectPlace={onSelectPlace}
        onDismissSelection={jest.fn()}
      />
    );`);

canvasText = canvasText.replace(/screen\.getByTestId/g, 'getByTestId');
canvasText = canvasText.replace(/screen\.getAllByTestId/g, 'getAllByTestId');
canvasText = canvasText.replace(/screen\.queryAllByTestId/g, 'queryAllByTestId');
canvasText = canvasText.replace(/screen\.getByLabelText/g, 'getByLabelText');

fs.writeFileSync('mobile/tests/ExploreMapCanvas.test.tsx', canvasText);
console.log('Fixed destructuring in ExploreMapCanvas.test.tsx');
