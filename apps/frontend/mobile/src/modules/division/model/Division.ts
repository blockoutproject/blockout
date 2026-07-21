export interface DivisionResponse {
  id: number;
  name: string;
  mainColor: string;
  firstGradientColor: string;
  secondGradientColor: string;
  thirdGradientColor: string;
  logoUrl: string | null;
  active: boolean;
  createdAt: string;
  lastUpdate: string;
}

export interface UpsertDivisionRequest {
  name: string;
  mainColor: string;
  firstGradientColor: string;
  secondGradientColor: string;
  thirdGradientColor: string;
}
