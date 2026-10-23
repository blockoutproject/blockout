import type { PurchasesOffering } from "react-native-purchases";
import {
  PACKAGE_TYPE,
  PRODUCT_CATEGORY,
  PRODUCT_TYPE,
} from "@revenuecat/purchases-typescript-internal";

/** Fictional store terms, deliberately different from launch pricing; native fields pass through unchanged. */
export const v2Offering: PurchasesOffering = {
  identifier: "v2",
  serverDescription: "V2",
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
      offeringIdentifier: "v2",
      webCheckoutUrl: null,
      presentedOfferingContext: {
        offeringIdentifier: "v2",
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
