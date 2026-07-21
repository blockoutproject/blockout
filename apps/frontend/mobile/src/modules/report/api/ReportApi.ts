import type {
  CreateReportRequest,
  ReportResponse,
} from "@/src/modules/report/model/Report";
import { BaseApi } from "@/src/shared/api/BaseApi";
import { CONFIG } from "@/src/shared/config/config";
import type { CustomImage } from "@/src/types/Common";

export class ReportApi extends BaseApi {
  constructor() {
    super({ baseURL: CONFIG.API_GATEWAY_BASE_URL });
  }

  public createReport(
    data: CreateReportRequest,
    images: readonly CustomImage[] = [],
  ) {
    const formData = new FormData();
    formData.append("data", JSON.stringify(data));

    images.forEach((image) => {
      formData.append("images", image as unknown as Blob);
    });

    return this.httpPublic.post<ReportResponse>("/reports", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
}
