import { useRouter } from "next/router";
import React from "react";

const HELP_CONTENT: Record<string, { title: string; body: React.ReactNode }> = {
  assets: {
    title: "Assets - Help & User Guide",
    body: (
      <>
        <p className="text-gray-700">
          Manage assets, specifications, documents, and lifecycle states. Use
          the Actions menu to add, edit, archive, or export.
        </p>
        <ul className="list-disc pl-5 mt-3 text-gray-700">
          <li>Use Filters to narrow results by status, category, or plant.</li>
          <li>Click an asset name to view details and history.</li>
          <li>Upload layout documents in the Documents tab.</li>
        </ul>
      </>
    ),
  },
  plants: {
    title: "Plants - Help & User Guide",
    body: (
      <>
        <p className="text-gray-700">
          Create and manage plants, floors, and layout documents. Use the wizard
          to add key information step-by-step.
        </p>
        <ul className="list-disc pl-5 mt-3 text-gray-700">
          <li>
            Add floors and upload layout files in supported formats (PDF/SVG).
          </li>
          <li>Place assets on floor layouts from the placement tool.</li>
        </ul>
      </>
    ),
  },
  "service-forms": {
    title: "Service Forms - Help & User Guide",
    body: (
      <>
        <p className="text-gray-700">
          Create, edit, and submit service forms with checklists and
          attachments.
        </p>
        <ul className="list-disc pl-5 mt-3 text-gray-700">
          <li>Save Draft to keep progress without submitting.</li>
          <li>Upload related documents via the Actions menu.</li>
        </ul>
      </>
    ),
  },
};

function GenericHelp({ slug }: { slug: string }) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-3">Help Center</h1>
      <p className="text-gray-700">
        No specific guide was found for{" "}
        <span className="font-mono">{slug}</span>. Below is a generic guide to
        get you started.
      </p>
      <div className="mt-6 space-y-4">
        <section>
          <h2 className="text-lg font-medium">How to use the Actions menu</h2>
          <ul className="list-disc pl-5 text-gray-700">
            <li>Click the three-dot menu at the top-right of the page.</li>
            <li>
              Select the desired action (Edit, Copy Link, Export, Get Help,
              etc.).
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-medium">Where to find more details</h2>
          <ul className="list-disc pl-5 text-gray-700">
            <li>Use filters and search to locate the right record.</li>
            <li>
              Open a record to view tabs for Info, Documents, History, and
              Activity.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default function HelpBySlugPage() {
  const router = useRouter();
  const slugParam = router.query.slug;
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam || "";

  const content = slug ? HELP_CONTENT[slug.toLowerCase()] : undefined;

  if (!slug) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-3">Help Center</h1>
        <p className="text-gray-700">Loading…</p>
      </div>
    );
  }

  if (!content) {
    return <GenericHelp slug={slug} />;
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">{content.title}</h1>
      <div className="prose max-w-none">{content.body}</div>
    </div>
  );
}
