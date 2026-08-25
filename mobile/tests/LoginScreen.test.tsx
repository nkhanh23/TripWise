import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";

import { LoginScreen } from "../src/features/auth/screens/LoginScreen";
import { IntegrationError } from "../src/integration/errors";

const mockSignIn = jest.fn();
jest.mock("../src/features/auth/AuthProvider", () => ({
  useAuth: () => ({ signIn: mockSignIn }),
}));

const navigation = {
  navigate: jest.fn(),
  canGoBack: jest.fn(() => true),
  goBack: jest.fn(),
} as never;

describe("LoginScreen real-auth composition", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(cleanup);

  async function fillAndSubmit() {
    const user = userEvent.setup();
    await user.type(
      screen.getByPlaceholderText("name@example.com"),
      "traveler@example.com",
    );
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.press(screen.getByLabelText("Đăng nhập"));
    return user;
  }

  it("keeps local malformed-email validation outside the repository", async () => {
    const user = userEvent.setup();
    await render(<LoginScreen navigation={navigation} route={{} as never} />);
    await user.press(screen.getByLabelText("Đăng nhập"));
    expect(
      await screen.findByText("Please enter a valid email address."),
    ).toBeTruthy();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("submits real credentials through AuthProvider and prevents duplicate submission", async () => {
    let finish: (() => void) | undefined;
    mockSignIn.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    await render(<LoginScreen navigation={navigation} route={{} as never} />);
    const user = await fillAndSubmit();
    await user.press(screen.getByLabelText("Đăng nhập"));
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith(
      "traveler@example.com",
      "password123",
    );
    await act(async () => finish?.());
  });

  it.each([
    [
      new IntegrationError("invalidCredentials"),
      "The email or password is incorrect.",
    ],
    [
      new IntegrationError("network"),
      "Unable to connect. Check your network and try again.",
    ],
  ])("shows centralized safe errors", async (error, message) => {
    mockSignIn.mockRejectedValue(error);
    await render(<LoginScreen navigation={navigation} route={{} as never} />);
    await fillAndSubmit();
    expect(await screen.findByText(message)).toBeTruthy();
  });
});
