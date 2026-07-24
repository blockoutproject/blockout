import { createReport } from "@/src/shared/generated/endpoints/report-public";
import type { CreateReportRequest } from "@/src/shared/generated/models";
import type { ImageUpload } from "@/src/shared/model/ImageUpload";

/** Expose report operations through the feature API boundary. */
export class ReportApi {
  /** Create a public report with its optional native image uploads. */
  public createReport(
    data: CreateReportRequest,
    images: readonly ImageUpload[] = [],
  ) {
    return createReport({
      data: JSON.stringify(data),
      images: images as unknown as Blob[],
    });
  }
}
