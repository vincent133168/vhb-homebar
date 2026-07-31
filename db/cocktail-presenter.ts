export type CocktailRow = {
  id: string; name: string; english_name: string; bar: string; city: string; category: string;
  rank: number | null; source_url: string | null; story: string; ingredients: string; recipe: string;
  measure_count: number | null; taste: string; strength: string; minutes: number; image_key: string | null; price: number;
};

export function presentCocktail(row: CocktailRow) {
  const catalogImage = row.category === "classic" || row.category === "topbar" ? `/cocktails/${row.id}.jpg` : "/cocktails/classic-negroni.jpg";
  return {
    id: row.id, name: row.name, englishName: row.english_name, bar: row.bar, city: row.city,
    category: row.category, rank: row.rank ?? undefined, sourceUrl: row.source_url ?? undefined,
    story: row.story, ingredients: JSON.parse(row.ingredients) as string[], recipe: JSON.parse(row.recipe) as string[],
    measureCount: row.measure_count ?? undefined,
    taste: row.taste, strength: row.strength, minutes: row.minutes,
    image: row.image_key ? `/api/images/${encodeURIComponent(row.image_key)}` : catalogImage,
    price: row.price, custom: row.category === "homebar",
  };
}
