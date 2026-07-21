import {CONFIG} from "@/src/config/config";
import {ReportResult} from "../types/Report";
import {CustomImage} from "../types/Common";
import {appendJson} from "../utils/utils";
import {BaseApi} from "./core/BaseApi";

export class ReportApi extends BaseApi {
  constructor() {
    super({baseURL: CONFIG.API_GATEWAY_BASE_URL});
  }

  public createReport(
    data: Record<string, any>,
    images?: CustomImage[],
  ) {
    const formData = new FormData();
    appendJson(formData, "data", data);
    if (images && images.length > 0) {
      images.forEach((img) => {
        formData.append("images", {
          uri: img.uri,
          type: img.type,
          name: img.name,
        } as any);
      });
    }

    return this.httpPublic.post<ReportResult>("/reports", formData, {
      headers: {"Content-Type": "multipart/form-data"},
    });
  }
}
