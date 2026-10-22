import type Purchases from "react-native-purchases";

/** Native I/O double only; each suite controls outcomes and resets its own lifecycle. */
export const mockPurchases = {
  configure: jest.fn<
    ReturnType<typeof Purchases.configure>,
    Parameters<typeof Purchases.configure>
  >(),
  isConfigured: jest.fn<ReturnType<typeof Purchases.isConfigured>, []>(),
  isAnonymous: jest.fn<ReturnType<typeof Purchases.isAnonymous>, []>(),
  logIn: jest.fn<
    ReturnType<typeof Purchases.logIn>,
    Parameters<typeof Purchases.logIn>
  >(),
  logOut: jest.fn<ReturnType<typeof Purchases.logOut>, []>(),
  getCustomerInfo: jest.fn<ReturnType<typeof Purchases.getCustomerInfo>, []>(),
  addCustomerInfoUpdateListener: jest.fn<
    ReturnType<typeof Purchases.addCustomerInfoUpdateListener>,
    Parameters<typeof Purchases.addCustomerInfoUpdateListener>
  >(),
  removeCustomerInfoUpdateListener: jest.fn<
    ReturnType<typeof Purchases.removeCustomerInfoUpdateListener>,
    Parameters<typeof Purchases.removeCustomerInfoUpdateListener>
  >(),
  setLogHandler: jest.fn<
    ReturnType<typeof Purchases.setLogHandler>,
    Parameters<typeof Purchases.setLogHandler>
  >(),
  VERIFICATION_RESULT: jest.requireActual(
    "@revenuecat/purchases-typescript-internal",
  ).VERIFICATION_RESULT,
};
