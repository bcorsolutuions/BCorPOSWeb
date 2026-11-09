import { getTranslations } from "next-intl/server";
import { TableMap } from "@/components/restaurant/table-map";

export default async function RestaurantTablesPage() {
  const t = await getTranslations("restaurant");

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="mb-4 text-xl font-semibold">{t("title")}</h1>
      <TableMap />
    </div>
  );
}
