import { prefetchApiJson } from "@/lib/api";
import { currentYearMonth } from "@/lib/month";

const prefetchedRoutes = new Set<string>();

/** Pre-carrega dados da API ao passar o rato / focar num link do menu. */
export function prefetchAppRoute(href: string): void {
  if (typeof window === "undefined") return;
  if (prefetchedRoutes.has(href)) return;
  prefetchedRoutes.add(href);

  const ym = currentYearMonth();

  switch (href) {
    case "/dashboard":
      prefetchApiJson(
        `/dashboard/summary?referenceMonth=${ym}`,
        `/reports/charts/monthly?months=6`,
        `/reports/summary/by-card?fromMonth=${ym}&toMonth=${ym}`,
      );
      break;
    case "/incomes":
      prefetchApiJson("/categories?type=income", "/incomes");
      break;
    case "/expenses":
      prefetchApiJson("/categories?type=expense", "/cards", "/expenses/purchases");
      break;
    case "/payments":
      prefetchApiJson("/cards");
      break;
    case "/reports":
      prefetchApiJson("/cards", "/categories?type=expense", "/reports/charts/monthly?months=12");
      break;
    case "/cards":
      prefetchApiJson("/cards");
      break;
    default:
      prefetchedRoutes.delete(href);
  }
}
