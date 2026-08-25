import { getAuthNavigationTarget } from "../src/navigation/authNavigation";

describe("authenticated navigation guard", () => {
  it("keeps bootstrap, auth, and protected app states distinct", () => {
    expect(getAuthNavigationTarget("bootstrapping")).toBe("bootstrap");
    expect(getAuthNavigationTarget("signedOut")).toBe("auth");
    expect(getAuthNavigationTarget("signedIn")).toBe("app");
  });
});
