import { SubmitForm } from "@/components/submit/submit-form";
import { Navbar } from "@/components/layout/navbar";

export const metadata = { title: "Submit a tool — GenAI Landscape" };

export default function SubmitPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Submit a tool</h1>
        <p className="mb-8 text-muted-foreground">
          Found a GenAI tool that's missing from the landscape? Submit it here.
          Our AI will evaluate it and add it if it fits.
        </p>
        <SubmitForm />
      </main>
    </>
  );
}
