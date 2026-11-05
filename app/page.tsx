import { redirect } from "next/navigation";

// Root redirects to the public landscape view
export default function RootPage() {
  redirect("/landscape");
}
