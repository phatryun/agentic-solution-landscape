import { SearchView } from "@/components/search/search-view";
import { Navbar } from "@/components/layout/navbar";

export const metadata = { title: "Search — GenAI Landscape" };

export default function SearchPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Search the Landscape</h1>
        <p className="mb-8 text-muted-foreground">
          Ask in natural language — the AI finds the right tools for you.
        </p>
        <SearchView />
      </main>
    </>
  );
}
