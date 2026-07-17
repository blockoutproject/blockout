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
