import type { PurchasesOffering } from "react-native-purchases";

const { PACKAGE_TYPE, PRODUCT_CATEGORY, PRODUCT_TYPE } = jest.requireActual<
  typeof import("react-native-purchases")
>("react-native-purchases");

/** Fictional store terms, deliberately different from launch pricing; native fields pass through unchanged. */
export const defaultOffering: PurchasesOffering = {
  identifier: "default",
  serverDescription: "Blockout Pro",
  metadata: {},
  lifetime: null,
  annual: null,
  sixMonth: null,
  threeMonth: null,
  twoMonth: null,
  monthly: null,
  weekly: null,
  webCheckoutUrl: null,
  availablePackages: [
    {
      identifier: "$rc_monthly",
      packageType: PACKAGE_TYPE.MONTHLY,
      offeringIdentifier: "default",
      webCheckoutUrl: null,
      presentedOfferingContext: {
        offeringIdentifier: "default",
        placementIdentifier: null,
        targetingContext: null,
      },
      product: {
        identifier: "monthly",
        title: "Abonnement mensuel",
        description: "Sans publicité Blockout",
        price: 4.29,
        priceString: "4,29 €",
        currencyCode: "EUR",
        pricePerWeek: null,
        pricePerMonth: null,
        pricePerYear: null,
        pricePerWeekString: null,
        pricePerMonthString: null,
        pricePerYearString: null,
        introPrice: null,
        discounts: null,
        productCategory: PRODUCT_CATEGORY.SUBSCRIPTION,
        productType: PRODUCT_TYPE.AUTO_RENEWABLE_SUBSCRIPTION,
        subscriptionPeriod: "P1M",
        defaultOption: null,
        subscriptionOptions: null,
        presentedOfferingContext: null,
        presentedOfferingIdentifier: null,
        installmentsInfo: null,
      },
    },
  ],
};
