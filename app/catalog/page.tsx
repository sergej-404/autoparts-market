import CatalogClient from "./CatalogClient";

type CatalogPageProps = {
  searchParams: Promise<{
    category?: string | string[];
    brand?: string | string[];
    q?: string | string[];
    query?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;

  return (
    <CatalogClient
      initialCategory={firstParam(params.category)}
      initialBrand={firstParam(params.brand)}
      initialQuery={firstParam(params.q ?? params.query)}
    />
  );
}
