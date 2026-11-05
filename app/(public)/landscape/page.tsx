import { LandscapeView } from "@/components/landscape/landscape-view";
import { listCategories, listSolutions } from "@/lib/s3/vault";
import { listCategoriesLocal, listSolutionsLocal } from "@/lib/s3/vault.local";

export const revalidate = 3600; // ISR — revalidate every hour

const isLocal = process.env.USE_LOCAL_VAULT === "true";

export default async function LandscapePage() {
  const [categories, solutions] = isLocal
    ? [listCategoriesLocal(), listSolutionsLocal()]
    : await Promise.all([listCategories(), listSolutions()]);

  return (
    <main className="min-h-screen bg-background">
      <LandscapeView categories={categories} solutions={solutions} />
    </main>
  );
}
