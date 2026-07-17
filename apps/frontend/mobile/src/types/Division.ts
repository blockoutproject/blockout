/** Division fields consumed by mobile lists, selectors, and the deferred editor. */
export interface Division {
  id: number;
  name: string;
  mainColor: string;
  firstGradientColor: string;
  secondGradientColor: string;
  thirdGradientColor: string;
  logoUrl: string | null;
  active: boolean;
}

/** Division label and styling embedded in catalog projections. */
export type CatalogDivision = Pick<
  Division,
  | 'name'
  | 'mainColor'
  | 'firstGradientColor'
  | 'secondGradientColor'
  | 'thirdGradientColor'
  | 'logoUrl'
>;
