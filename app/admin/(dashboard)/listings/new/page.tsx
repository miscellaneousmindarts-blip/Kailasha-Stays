import { NewListingForm } from "./new-listing-form";

export default function NewListingPage() {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold">New listing</h1>
      <p className="text-text-muted mt-1">
        Start with a title — it&apos;s created as a draft, invisible to
        visitors until you publish it.
      </p>
      <div className="mt-6">
        <NewListingForm />
      </div>
    </div>
  );
}
