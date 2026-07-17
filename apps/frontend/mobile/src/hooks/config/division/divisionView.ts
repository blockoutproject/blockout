import type { MobileDivision } from '@/src/api/generated/mobile-gateway/models';
import type { Division } from '@/src/types/Division';

/**
 * Projects a canonical division response into the existing mobile view.
 *
 * @param response - Validated mobile division response.
 * @returns Division fields used by lists, selectors, and the deferred form.
 */
export function toDivisionView(response: MobileDivision): Division {
  return {
    id: response.id,
    name: response.name,
    mainColor: response.mainColor,
    firstGradientColor: response.firstGradientColor,
    secondGradientColor: response.secondGradientColor,
    thirdGradientColor: response.thirdGradientColor,
    logoUrl: response.logoUrl,
    active: response.active,
  };
}
